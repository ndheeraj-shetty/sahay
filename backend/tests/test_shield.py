import uuid
import pytest
from fastapi.testclient import TestClient

from app.models.shield import ConsentType


def test_security_activity_overview_and_audit_logging(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"shield.tester.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Shield Tester"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. Check Initial Security Overview
    res_overview = client.get("/api/v1/security/activity", headers=headers)
    assert res_overview.status_code == 200
    ov_data = res_overview.json()
    assert ov_data["encryption_standard"] == "AES-256-GCM Envelope Encryption"
    assert "total_audit_events_count" in ov_data

    # 2. Grant a consent which generates an audit log
    grant_res = client.post(
        "/api/v1/security/consents",
        json={
            "consent_type": "ocr_processing",
            "purpose_description": "Extract text from uploaded family bills and invoices",
        },
        headers=headers,
    )
    assert grant_res.status_code == 201
    consent_id = grant_res.json()["id"]

    # 3. Fetch Audit Logs
    audit_res = client.get("/api/v1/security/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1
    assert any(l["action"] == "consent.granted" for l in logs)

    # Filter audit logs by module
    filter_res = client.get("/api/v1/security/audit-logs?module=security", headers=headers)
    assert filter_res.status_code == 200
    assert len(filter_res.json()) >= 1


def test_consent_management_lifecycle(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"consent.tester.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Consent Tester"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. Grant AI Assistant Retrieval Consent
    grant_res = client.post(
        "/api/v1/security/consents",
        json={
            "consent_type": "ai_retrieval",
            "purpose_description": "Allow Sahay AI Assistant to index authorized household records",
        },
        headers=headers,
    )
    assert grant_res.status_code == 201
    c_data = grant_res.json()
    assert c_data["is_granted"] is True
    consent_id = c_data["id"]

    # 2. List Consents
    list_res = client.get("/api/v1/security/consents", headers=headers)
    assert list_res.status_code == 200
    consents = list_res.json()
    assert any(c["id"] == consent_id and c["is_granted"] for c in consents)

    # 3. Withdraw Consent
    withdraw_res = client.post(f"/api/v1/security/consents/{consent_id}/withdraw", headers=headers)
    assert withdraw_res.status_code == 200
    w_data = withdraw_res.json()
    assert w_data["is_granted"] is False
    assert w_data["withdrawn_at"] is not None


def test_data_export_and_deletion_workflows(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"export.tester.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Export Tester"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. Request DPDP / GDPR Data Export
    export_res = client.post(
        "/api/v1/security/export",
        json={
            "include_documents": True,
            "include_health": True,
            "include_daily": True,
            "include_goals": True,
        },
        headers=headers,
    )
    assert export_res.status_code == 200
    exp_data = export_res.json()
    assert exp_data["status"] == "completed"
    assert "/api/v1/security/exports/download/" in exp_data["download_url"]

    # 2. Request Data Deletion with invalid password -> 400
    bad_del_res = client.post(
        "/api/v1/security/deletion-request",
        json={"reason": "Closing family account", "confirm_password": "WrongPassword!"},
        headers=headers,
    )
    assert bad_del_res.status_code == 400

    # 3. Request Data Deletion with valid password -> 200
    good_del_res = client.post(
        "/api/v1/security/deletion-request",
        json={"reason": "Closing family account", "confirm_password": pwd},
        headers=headers,
    )
    assert good_del_res.status_code == 200
    del_data = good_del_res.json()
    assert del_data["status"] == "pending"

    # 4. Verify Security Event was recorded
    events_res = client.get("/api/v1/security/events", headers=headers)
    assert events_res.status_code == 200
    events = events_res.json()
    assert any(e["event_type"] == "deletion_requested" for e in events)
