import io
import uuid
import pytest
from app.models.vault import Document, DocumentCategory, DocumentAccessLevel
from app.models.doctor import ExtractedDocumentField, DocumentProcessingJob, JobStatus
from app.services.document_doctor import DocumentDoctorEngine


def test_document_change_intelligence_api(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"compare.test.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register Owner
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Vikram Patel"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Baseline Policy (Old Policy - 2025)
    old_policy_content = b"""
    HDFC ERGO Health Suraksha Policy
    Policy Number: HDFC-MED-2025-99128
    Insured Name: Vikram Patel
    Sum Insured: Rs. 500000
    Annual Premium: Rs. 14200
    Policy Expiry: 15/12/2025
    Room Rent Limit: 1% of Sum Insured
    Co-pay: 10%
    """
    file_old = {
        "file": ("policy_2025.txt", io.BytesIO(old_policy_content), "text/plain")
    }
    form_old = {
        "title": "HDFC Health Policy 2025",
        "category": "financial",
        "access_level": "shared_adults",
        "tags": "insurance,health,hdfc",
    }
    resp1 = client.post("/api/v1/documents/upload", headers=headers, data=form_old, files=file_old)
    assert resp1.status_code == 201
    baseline_doc = resp1.json()
    baseline_id = baseline_doc["id"]

    # 3. Upload Updated Policy (Renewed Policy - 2026)
    new_policy_content = b"""
    HDFC ERGO Health Suraksha Policy (Renewed)
    Policy Number: HDFC-MED-2026-99128
    Insured Name: Vikram Patel
    Sum Insured: Rs. 750000
    Annual Premium: Rs. 16800
    Policy Expiry: 15/12/2026
    Room Rent Limit: Single Private AC Room
    Co-pay: 0%
    New Condition: AYUSH Treatment Covered up to Sum Insured
    """
    file_new = {
        "file": ("policy_2026.txt", io.BytesIO(new_policy_content), "text/plain")
    }
    form_new = {
        "title": "HDFC Health Policy 2026 (Renewed)",
        "category": "financial",
        "access_level": "shared_adults",
        "tags": "insurance,health,hdfc,renewed",
    }
    resp2 = client.post("/api/v1/documents/upload", headers=headers, data=form_new, files=file_new)
    assert resp2.status_code == 201
    updated_doc = resp2.json()
    updated_id = updated_doc["id"]

    # 4. Invoke "What Changed?" Document Comparison Endpoint
    compare_resp = client.post(
        "/api/v1/document-doctor/compare",
        headers=headers,
        json={
            "baseline_document_id": baseline_id,
            "updated_document_id": updated_id,
        },
    )
    assert compare_resp.status_code == 200, f"Compare failed: {compare_resp.text}"
    result = compare_resp.json()

    # 5. Verify Structure & Inferred Deviations
    assert result["baseline_document_id"] == baseline_id
    assert result["updated_document_id"] == updated_id
    assert result["baseline_title"] == "HDFC Health Policy 2025"
    assert result["updated_title"] == "HDFC Health Policy 2026 (Renewed)"
    assert len(result["field_changes"]) > 0
    assert len(result["executive_summary"]) > 0
    assert len(result["ai_explanation"]) > 0

    # Ensure field changes list contains premium / coverage or changes
    change_field_names = [fc["field_name"] for fc in result["field_changes"]]
    assert any(name in change_field_names for name in ["premium_amount", "amount", "expiry_date", "valid_until", "title"])
