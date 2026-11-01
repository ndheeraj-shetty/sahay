import io
import os
import uuid
import pytest
from app.core.crypto import decrypt_file_bytes


def test_document_upload_and_extraction_workflow(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"owner.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register Owner
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Rajesh Sharma"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload sample electricity bill
    sample_bill_content = b"""
    MAHADISCOM - Maharashtra State Electricity Distribution Co. Ltd.
    Electricity Bill for October 2026
    Consumer No: 02847192841
    Billing Unit: 4821
    Total Amount Due: Rs. 1450.00
    Due Date: 15-Nov-2026
    """
    file_payload = {
        "file": ("mseb_bill_oct.pdf", io.BytesIO(sample_bill_content), "application/pdf")
    }
    form_data = {
        "title": "MSEB Electricity Bill - October 2026",
        "category": "household",
        "access_level": "shared_adults",
        "tags": "utility,electricity,mseb",
    }

    upload_resp = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data=form_data,
        files=file_payload,
    )
    assert upload_resp.status_code == 201
    doc = upload_resp.json()
    assert doc["title"] == "MSEB Electricity Bill - October 2026"
    assert doc["category"] == "household"
    assert doc["document_type"] == "electricity_bill"
    assert doc["file_hash"] is not None
    assert doc["is_encrypted"] is True
    assert doc["encryption_algorithm"] == "AES-256-GCM"
    doc_id = doc["id"]

    # 3. Verify on-disk file is ENCRYPTED (never unencrypted raw content)
    # File download decodes on-the-fly and matches original bytes exactly
    download_resp = client.get(
        f"/api/v1/documents/{doc_id}/download",
        headers=headers,
    )
    assert download_resp.status_code == 200
    assert download_resp.content == sample_bill_content

    # 4. Retrieve Document Doctor Results
    results_resp = client.get(
        f"/api/v1/document-doctor/results/{doc_id}",
        headers=headers,
    )
    assert results_resp.status_code == 200
    job = results_resp.json()
    assert job["status"] == "completed"
    assert job["document_classification"] == "electricity_bill"
    assert len(job["extracted_fields"]) >= 3

    # Check extracted values
    fields = {f["field_name"]: f["field_value"] for f in job["extracted_fields"]}
    assert "biller_name" in fields
    assert "consumer_number" in fields
    assert "amount_due" in fields

    # 5. Perform User Verification Workflow
    verify_resp = client.post(
        f"/api/v1/document-doctor/verify/{doc_id}",
        headers=headers,
        json={
            "confirmed_fields": [
                {"field_name": "amount_due", "confirmed_value": "1450.00"},
                {"field_name": "due_date", "confirmed_value": "15-Nov-2026"},
            ]
        },
    )
    assert verify_resp.status_code == 200
    verified_job = verify_resp.json()
    verified_fields = [f for f in verified_job["extracted_fields"] if f["is_verified_by_user"]]
    assert len(verified_fields) >= 2

    # Verify document is marked verified
    doc_check = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert doc_check.status_code == 200
    assert doc_check.json()["is_verified"] is True

    # 6. Financial Event Parser
    sms_text = "Your EMI of Rs.18500 for loan HL-88213 has been debited on 05-Nov-2026."
    sms_resp = client.post(
        "/api/v1/document-doctor/financial-event",
        headers=headers,
        json={"sms_or_alert_text": sms_text},
    )
    assert sms_resp.status_code == 200
    sms_data = sms_resp.json()
    assert sms_data["event_type"] == "emi_debit"
    assert sms_data["amount"] == 18500.0


def test_image_document_encryption_and_accurate_extraction(client):
    """
    Verifies that uploading image/scanned documents extracts structured metadata
    accurately and encrypts the document file using AES-256-GCM.
    """
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"image.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Priya Sharma"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate an image upload (e.g. photo of an insurance policy)
    image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRsimulated_image_bytes_for_vault"
    file_payload = {
        "file": ("star_health_insurance.png", io.BytesIO(image_bytes), "image/png")
    }
    form_data = {
        "title": "Star Health Insurance Policy 2026",
        "category": "financial",
        "access_level": "shared_adults",
        "tags": "insurance,health,star_health",
    }

    upload_resp = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data=form_data,
        files=file_payload,
    )
    assert upload_resp.status_code == 201
    doc = upload_resp.json()
    assert doc["is_encrypted"] is True
    assert doc["encryption_algorithm"] == "AES-256-GCM"
    assert doc["document_type"] == "insurance_policy"
    doc_id = doc["id"]

    # Verify extracted structured fields are NOT empty and contain required fields
    results_resp = client.get(
        f"/api/v1/document-doctor/results/{doc_id}",
        headers=headers,
    )
    assert results_resp.status_code == 200
    job = results_resp.json()
    assert len(job["extracted_fields"]) >= 3

    field_names = [f["field_name"] for f in job["extracted_fields"]]
    assert "insurer_name" in field_names
    assert "policy_number" in field_names
    assert "premium_amount" in field_names

    # Decrypt and verify download returns identical original image bytes
    download_resp = client.get(
        f"/api/v1/documents/{doc_id}/download",
        headers=headers,
    )
    assert download_resp.status_code == 200
    assert download_resp.content == image_bytes
