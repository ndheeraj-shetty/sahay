import uuid
from datetime import date, datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_household,
    get_current_household_membership,
    get_current_user,
)
from app.db.session import get_db
from app.models.auth import Household, HouseholdMember, User
from app.models.daily import (
    Obligation,
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
)
from app.models.doctor import (
    DocumentProcessingJob,
    ExtractedDocumentField,
    JobStatus,
)
from app.models.vault import Document
from app.schemas.doctor import (
    DocumentDoctorJobResponse,
    ExtractedFieldResponse,
    FinancialEventRequest,
    FinancialEventResponse,
    VerifyDocumentRequest,
    DocumentCompareRequest,
    DocumentCompareResponse,
)
from app.services.document_doctor import DocumentDoctorEngine

router = APIRouter()


@router.post("/process/{document_id}", response_model=DocumentDoctorJobResponse)
async def process_document(
    document_id: str,
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

    # 1. OCR text extraction (auto-decrypts if encrypted on disk)
    ocr_text = DocumentDoctorEngine.extract_text(doc.file_path, doc.mime_type)
    detected_cat, detected_type, confidence = DocumentDoctorEngine.classify_document(
        ocr_text, doc.file_name, doc.title, doc.category.value if doc.category else ""
    )

    effective_type = detected_type if doc.document_type == "general" else doc.document_type
    fields = DocumentDoctorEngine.extract_structured_fields(
        ocr_text,
        effective_type,
        doc.file_name,
        doc.title,
        doc.category.value if doc.category else "other",
    )

    # 2. Create Job with metadata summary only
    sanitized_summary = (
        f"Metadata summary: {len(fields)} fields extracted for {effective_type}. "
        f"Classified as {detected_cat} with confidence {confidence:.2f}."
    )
    job = DocumentProcessingJob(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        household_id=household.id,
        status=JobStatus.COMPLETED,
        ocr_text=sanitized_summary,
        document_classification=effective_type,
        confidence_score=confidence,
    )
    db.add(job)
    await db.flush()

    # 3. Save Extracted Fields
    extracted_records = []
    for f in fields:
        field_rec = ExtractedDocumentField(
            id=str(uuid.uuid4()),
            job_id=job.id,
            document_id=doc.id,
            field_name=f["field_name"],
            field_value=f["field_value"],
            confidence=f["confidence"],
            source_evidence=f["source_evidence"],
            is_masked=f["is_masked"],
        )
        db.add(field_rec)
        extracted_records.append(field_rec)

    await db.commit()

    return DocumentDoctorJobResponse(
        id=job.id,
        document_id=job.document_id,
        household_id=job.household_id,
        status=job.status,
        document_classification=job.document_classification,
        confidence_score=job.confidence_score,
        extracted_fields=[ExtractedFieldResponse.model_validate(r) for r in extracted_records],
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/results/{document_id}", response_model=DocumentDoctorJobResponse)
async def get_document_results(
    document_id: str,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentProcessingJob)
        .options(selectinload(DocumentProcessingJob.extracted_fields))
        .where(
            DocumentProcessingJob.document_id == document_id,
            DocumentProcessingJob.household_id == household.id,
        )
        .order_by(DocumentProcessingJob.created_at.desc())
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=404,
            detail="No Document Doctor intelligence results found for this document.",
        )

    return DocumentDoctorJobResponse(
        id=job.id,
        document_id=job.document_id,
        household_id=job.household_id,
        status=job.status,
        document_classification=job.document_classification,
        confidence_score=job.confidence_score,
        extracted_fields=[ExtractedFieldResponse.model_validate(f) for f in job.extracted_fields],
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/verify/{document_id}", response_model=DocumentDoctorJobResponse)
async def verify_document_fields(
    document_id: str,
    data: VerifyDocumentRequest,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    # Fetch latest job
    result = await db.execute(
        select(DocumentProcessingJob)
        .options(selectinload(DocumentProcessingJob.extracted_fields))
        .where(
            DocumentProcessingJob.document_id == document_id,
            DocumentProcessingJob.household_id == household.id,
        )
        .order_by(DocumentProcessingJob.created_at.desc())
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="No processing job found to verify.")

    # Fetch document
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.household_id == household.id)
    )
    doc = doc_res.scalar_one()

    # Map user confirmed values
    confirmed_map = {item.field_name: item.confirmed_value for item in data.confirmed_fields}

    for field in job.extracted_fields:
        if field.field_name in confirmed_map:
            field.user_confirmed_value = confirmed_map[field.field_name]
            field.is_verified_by_user = True
            db.add(field)

    doc.is_verified = True
    db.add(doc)

    if data.confirm_as_obligation:
        # Check if an obligation already exists for this document
        existing_ob_res = await db.execute(
            select(Obligation).where(
                Obligation.household_id == household.id,
                Obligation.source_document_id == document_id,
            )
        )
        if not existing_ob_res.scalars().first():
            classification = (job.document_classification or "").lower()
            ob_type = ObligationType.BILL
            category = "utility"
            if "insurance" in classification:
                ob_type = ObligationType.INSURANCE
                category = "insurance"
            elif "prescription" in classification or "rx" in classification:
                ob_type = ObligationType.HEALTH_TASK
                category = "health"
            elif "emi" in classification or "loan" in classification:
                ob_type = ObligationType.EMI
                category = "loan"

            is_identity_doc = any(
                id_word in classification
                for id_word in ["identity", "aadhaar", "pan", "passport", "voter", "license", "licence"]
            )

            # Robust amount extraction across all common field aliases
            amount_val = 0.0
            amount_candidates = [
                confirmed_map.get("amount_due"),
                confirmed_map.get("amount"),
                confirmed_map.get("total_amount"),
                confirmed_map.get("premium_amount"),
                confirmed_map.get("emi_amount"),
                confirmed_map.get("fee_amount"),
                confirmed_map.get("statement_amount"),
                confirmed_map.get("detected_amount"),
            ]
            for k, v in confirmed_map.items():
                if any(sub in k.lower() for sub in ["amount", "due", "total", "premium", "fee"]) and v:
                    amount_candidates.append(v)

            for cand in amount_candidates:
                if cand:
                    try:
                        clean_str = "".join(c for c in str(cand) if c.isdigit() or c == ".")
                        val = float(clean_str) if clean_str else 0.0
                        if val > 0:
                            amount_val = val
                            break
                    except (ValueError, TypeError):
                        continue

            if not is_identity_doc and (amount_val > 0 or "due_date" in confirmed_map or "next_due_date" in confirmed_map):
                due_date_val = date.today() + timedelta(days=15)
                date_candidate = confirmed_map.get("due_date") or confirmed_map.get("next_due_date")
                if date_candidate:
                    try:
                        if "-" in date_candidate and len(date_candidate.split("-")[0]) == 4:
                            due_date_val = date.fromisoformat(date_candidate.strip())
                        elif "/" in date_candidate:
                            parts = [int(p) for p in date_candidate.split("/") if p.isdigit()]
                            if len(parts) == 3 and parts[2] > 1000:
                                due_date_val = date(parts[2], parts[1], parts[0])
                        elif "-" in date_candidate:
                            parts = [int(p) for p in date_candidate.split("-") if p.isdigit()]
                            if len(parts) == 3 and parts[2] > 1000:
                                due_date_val = date(parts[2], parts[1], parts[0])
                    except Exception:
                        due_date_val = date.today() + timedelta(days=15)

                consumer_no = (
                    confirmed_map.get("consumer_number")
                    or confirmed_map.get("policy_number")
                    or confirmed_map.get("account_number")
                )
                biller_name = (
                    confirmed_map.get("biller_name")
                    or confirmed_map.get("insurer_name")
                    or confirmed_map.get("doctor_name")
                    or doc.title
                )

                new_ob = Obligation(
                    household_id=household.id,
                    created_by_user_id=current_user.id,
                    assigned_member_id=doc.target_member_id,
                    source_document_id=doc.id,
                    title=f"{biller_name} Payment",
                    obligation_type=ob_type,
                    category=category,
                    biller_or_payee=biller_name,
                    account_or_consumer_no=consumer_no,
                    amount=amount_val,
                    currency="INR",
                    due_date=due_date_val,
                    priority=ObligationPriority.HIGH if amount_val > 1000 else ObligationPriority.MEDIUM,
                    status=ObligationStatus.PENDING,
                    recurrence=RecurrenceFrequency.MONTHLY,
                    notes=f"Auto-generated from verified document: {doc.title}",
                )
                db.add(new_ob)

    await db.commit()

    return DocumentDoctorJobResponse(
        id=job.id,
        document_id=job.document_id,
        household_id=job.household_id,
        status=job.status,
        document_classification=job.document_classification,
        confidence_score=1.0,
        extracted_fields=[ExtractedFieldResponse.model_validate(f) for f in job.extracted_fields],
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/financial-event", response_model=FinancialEventResponse)
async def parse_financial_event(data: FinancialEventRequest):
    parsed = DocumentDoctorEngine.parse_financial_event(data.sms_or_alert_text)
    return FinancialEventResponse(**parsed)


@router.post("/compare", response_model=DocumentCompareResponse)
async def compare_documents(
    payload: DocumentCompareRequest,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await DocumentDoctorEngine.compare_documents(
            baseline_doc_id=payload.baseline_document_id,
            updated_doc_id=payload.updated_document_id,
            household_id=household.id,
            db=db,
        )
        return DocumentCompareResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Comparison failed: {str(e)}")
