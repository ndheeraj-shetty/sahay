import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_household,
    get_current_household_membership,
    get_current_user,
)
from app.core.crypto import decrypt_file_bytes, encrypt_file_bytes
from app.db.session import get_db
from app.models.auth import Household, HouseholdMember, MemberRole, User
from app.models.doctor import (
    DocumentProcessingJob,
    ExtractedDocumentField,
    JobStatus,
)
from app.models.vault import (
    AccessRequestStatus,
    Document,
    DocumentAccessGrant,
    DocumentAccessLevel,
    DocumentCategory,
    DocumentRequest,
    DocumentVersion,
)
from app.schemas.vault import (
    AccessRequestCreate,
    AccessRequestResponse,
    DocumentResponse,
    DocumentUpdate,
)
from app.services.document_doctor import DocumentDoctorEngine

router = APIRouter()

STORAGE_BASE_DIR = os.path.abspath("storage/documents")


def check_document_access(doc: Document, user_id: str, member_role: MemberRole, grants: List[DocumentAccessGrant]) -> bool:
    """Verifies whether the user is authorized to view this document."""
    # 1. Document owner/uploader always has access
    if doc.owner_user_id == user_id:
        return True

    # 2. Household Owner has administrative access
    if member_role == MemberRole.OWNER:
        return True

    # 3. Explicit access grant check
    now = datetime.now(timezone.utc)
    for g in grants:
        if g.user_id == user_id and not g.is_revoked:
            exp = g.expires_at.replace(tzinfo=timezone.utc) if g.expires_at.tzinfo is None else g.expires_at
            if exp > now:
                return True

    # 4. Access level rules
    if doc.access_level == DocumentAccessLevel.HOUSEHOLD:
        return True

    if doc.access_level == DocumentAccessLevel.SHARED_ADULTS:
        return member_role in [MemberRole.OWNER, MemberRole.ADULT]

    return False


def serialize_document(doc: Document, user_id: str, member_role: MemberRole) -> DocumentResponse:
    can_acc = check_document_access(doc, user_id, member_role, doc.access_grants)
    return DocumentResponse(
        id=doc.id,
        household_id=doc.household_id,
        owner_user_id=doc.owner_user_id,
        owner_name=doc.owner_user.full_name if doc.owner_user else None,
        target_member_id=doc.target_member_id,
        target_member_name=doc.target_member.display_name if doc.target_member else (doc.target_member.user.full_name if doc.target_member and doc.target_member.user else None),
        title=doc.title,
        category=doc.category,
        document_type=doc.document_type,
        file_name=doc.file_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        file_hash=doc.file_hash,
        access_level=doc.access_level,
        is_verified=doc.is_verified,
        is_encrypted=getattr(doc, "is_encrypted", True),
        encryption_algorithm=getattr(doc, "encryption_algorithm", "AES-256-GCM"),
        expiry_date=doc.expiry_date,
        tags=doc.tags,
        issuer=doc.issuer,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        can_access=can_acc,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    target_member_id: Optional[str] = Form(None),
    access_level: Optional[str] = Form(DocumentAccessLevel.SHARED_ADULTS.value),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    # 1. Read file bytes and calculate SHA-256
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    file_size = len(file_bytes)
    original_filename = file.filename or "document.pdf"
    content_type = file.content_type or "application/octet-stream"

    # 2. In-memory metadata & structured field extraction BEFORE encryption
    ocr_text = DocumentDoctorEngine.extract_text_from_bytes(file_bytes, content_type, original_filename)
    detected_cat, detected_type, confidence = DocumentDoctorEngine.classify_document(
        ocr_text, original_filename, title, category or ""
    )

    doc_cat = DocumentCategory(category) if category in [e.value for e in DocumentCategory] else None
    if not doc_cat:
        try:
            doc_cat = DocumentCategory(detected_cat)
        except Exception:
            doc_cat = DocumentCategory.OTHER

    effective_type = document_type or detected_type
    fields = DocumentDoctorEngine.extract_structured_fields(
        ocr_text, effective_type, original_filename, title, doc_cat.value
    )

    # 3. Encrypt file bytes with AES-256-GCM envelope encryption
    encrypted_bytes = encrypt_file_bytes(file_bytes)

    # 4. Save ONLY encrypted bytes to disk
    household_dir = os.path.join(STORAGE_BASE_DIR, household.id)
    os.makedirs(household_dir, exist_ok=True)
    stored_filename = f"{file_hash[:12]}_{original_filename}.enc"
    file_path = os.path.join(household_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(encrypted_bytes)

    # 5. Create Document Record with metadata only
    doc_id = str(uuid.uuid4())
    doc_access = DocumentAccessLevel(access_level) if access_level in [e.value for e in DocumentAccessLevel] else DocumentAccessLevel.SHARED_ADULTS

    # Discover issuer from extracted fields
    auto_issuer = None
    for fld in fields:
        if fld["field_name"] in ["biller_name", "insurer_name", "lender_name", "institution_name", "issuing_authority"]:
            auto_issuer = fld["field_value"]
            break

    new_doc = Document(
        id=doc_id,
        household_id=household.id,
        owner_user_id=current_user.id,
        target_member_id=target_member_id,
        title=title,
        category=doc_cat,
        document_type=effective_type,
        file_path=file_path,
        file_name=original_filename,
        file_size=file_size,
        mime_type=content_type,
        file_hash=file_hash,
        access_level=doc_access,
        is_verified=False,
        is_encrypted=True,
        encryption_algorithm="AES-256-GCM",
        tags=tags,
        issuer=auto_issuer,
    )
    db.add(new_doc)
    await db.flush()

    # 6. Create Document Version 1
    new_version = DocumentVersion(
        id=str(uuid.uuid4()),
        document_id=new_doc.id,
        version_number=1,
        file_path=file_path,
        file_hash=file_hash,
        file_size=file_size,
        uploaded_by_user_id=current_user.id,
    )
    db.add(new_version)
    await db.flush()

    # 7. Create Document Processing Job with sanitized metadata summary (no unencrypted raw text leakage)
    sanitized_summary = (
        f"Metadata summary: {len(fields)} fields extracted for {effective_type}. "
        f"Classified as {doc_cat.value} with confidence {confidence:.2f}. "
        f"Encrypted on disk via AES-256-GCM envelope."
    )
    job = DocumentProcessingJob(
        id=str(uuid.uuid4()),
        document_id=new_doc.id,
        household_id=household.id,
        status=JobStatus.COMPLETED,
        ocr_text=sanitized_summary,
        document_classification=effective_type,
        confidence_score=confidence,
    )
    db.add(job)
    await db.flush()

    # 8. Insert Extracted Structured Fields
    for f in fields:
        field_rec = ExtractedDocumentField(
            id=str(uuid.uuid4()),
            job_id=job.id,
            document_id=new_doc.id,
            field_name=f["field_name"],
            field_value=f["field_value"],
            confidence=f["confidence"],
            source_evidence=f["source_evidence"],
            is_masked=f["is_masked"],
        )
        db.add(field_rec)

    await db.commit()

    # Fetch document with relationships
    res = await db.execute(
        select(Document)
        .options(
            selectinload(Document.owner_user),
            selectinload(Document.target_member).selectinload(HouseholdMember.user),
            selectinload(Document.access_grants),
        )
        .where(Document.id == new_doc.id)
    )
    loaded_doc = res.scalar_one()

    return serialize_document(loaded_doc, current_user.id, membership.role)


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    category: Optional[DocumentCategory] = Query(None),
    member_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Document)
        .options(
            selectinload(Document.owner_user),
            selectinload(Document.target_member).selectinload(HouseholdMember.user),
            selectinload(Document.access_grants),
        )
        .where(Document.household_id == household.id)
    )

    if category:
        query = query.where(Document.category == category)
    if member_id:
        query = query.where(Document.target_member_id == member_id)
    if search:
        s = f"%{search.lower()}%"
        query = query.where(
            or_(
                Document.title.ilike(s),
                Document.document_type.ilike(s),
                Document.tags.ilike(s),
                Document.issuer.ilike(s),
            )
        )

    query = query.order_by(Document.created_at.desc())
    result = await db.execute(query)
    docs = result.scalars().all()

    return [serialize_document(d, current_user.id, membership.role) for d in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.owner_user),
            selectinload(Document.target_member).selectinload(HouseholdMember.user),
            selectinload(Document.access_grants),
        )
        .where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return serialize_document(doc, current_user.id, membership.role)


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    inline: bool = Query(False, description="Whether to view inline or download as attachment"),
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.access_grants))
        .where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not check_document_access(doc, current_user.id, membership.role, doc.access_grants):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view or download this private document.",
        )

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on server.")

    with open(doc.file_path, "rb") as f:
        stored_bytes = f.read()

    # Decrypt AES-256-GCM envelope on-the-fly
    decrypted_bytes = decrypt_file_bytes(stored_bytes)
    disposition = "inline" if inline else f'attachment; filename="{doc.file_name}"'

    return Response(
        content=decrypted_bytes,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": disposition,
            "Content-Length": str(len(decrypted_bytes)),
        },
    )


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Inline view endpoint for document preview modal."""
    return await download_document(
        document_id=document_id,
        inline=True,
        current_user=current_user,
        household=household,
        membership=membership,
        db=db,
    )


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.owner_user),
            selectinload(Document.target_member).selectinload(HouseholdMember.user),
            selectinload(Document.access_grants),
        )
        .where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if membership.role != MemberRole.OWNER and doc.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the document owner can update metadata.")

    if data.title is not None:
        doc.title = data.title
    if data.category is not None:
        doc.category = data.category
    if data.document_type is not None:
        doc.document_type = data.document_type
    if data.expiry_date is not None:
        doc.expiry_date = data.expiry_date
    if data.tags is not None:
        doc.tags = data.tags
    if data.issuer is not None:
        doc.issuer = data.issuer
    if data.target_member_id is not None:
        doc.target_member_id = data.target_member_id
    if data.access_level is not None:
        doc.access_level = data.access_level

    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return serialize_document(doc, current_user.id, membership.role)


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if membership.role != MemberRole.OWNER and doc.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")

    # Remove file from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully."}


@router.post("/{document_id}/request-access", response_model=AccessRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_document_access(
    document_id: str,
    data: AccessRequestCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    new_req = DocumentRequest(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        requester_user_id=current_user.id,
        reason=data.reason,
        status=AccessRequestStatus.PENDING,
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)

    return AccessRequestResponse(
        id=new_req.id,
        document_id=new_req.document_id,
        document_title=doc.title,
        requester_user_id=current_user.id,
        requester_name=current_user.full_name,
        reason=new_req.reason,
        status=new_req.status,
        created_at=new_req.created_at,
        responded_at=new_req.responded_at,
    )


@router.post("/{document_id}/approve-request/{request_id}", status_code=status.HTTP_200_OK)
async def approve_access_request(
    document_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if membership.role != MemberRole.OWNER and doc.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the document owner can approve access.")

    req_res = await db.execute(
        select(DocumentRequest).where(DocumentRequest.id == request_id, DocumentRequest.document_id == doc.id)
    )
    req = req_res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found.")

    req.status = AccessRequestStatus.APPROVED
    req.responded_at = datetime.now(timezone.utc)

    # Create 30-day Access Grant
    grant = DocumentAccessGrant(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        user_id=req.requester_user_id,
        granted_by_user_id=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        is_revoked=False,
    )
    db.add(grant)
    await db.commit()

    return {"message": "Document access granted for 30 days."}
