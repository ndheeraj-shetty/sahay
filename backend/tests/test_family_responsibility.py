import uuid
from datetime import date, timedelta
import pytest


def test_family_responsibility_intelligence(client):
    suffix = uuid.uuid4().hex[:6]
    father_email = f"father.{suffix}@example.com"
    mother_email = f"mother.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register Father (Rajesh Sharma - Owner)
    reg_father = client.post(
        "/api/v1/auth/register",
        json={"email": father_email, "password": pwd, "full_name": "Rajesh Sharma"},
    )
    assert reg_father.status_code == 201
    father_token = reg_father.json()["access_token"]
    headers_father = {"Authorization": f"Bearer {father_token}"}

    # Get Household Info and Father's Member ID
    hh_resp = client.get("/api/v1/households/current", headers=headers_father)
    assert hh_resp.status_code == 200
    household = hh_resp.json()
    father_member = next(m for m in household["members"] if m["user_id"] == reg_father.json()["user"]["id"])
    father_member_id = father_member["id"]

    # 2. Register Mother (Priya Sharma)
    reg_mother = client.post(
        "/api/v1/auth/register",
        json={"email": mother_email, "password": pwd, "full_name": "Priya Sharma"},
    )
    assert reg_mother.status_code == 201
    mother_token = reg_mother.json()["access_token"]
    headers_mother = {"Authorization": f"Bearer {mother_token}"}

    # Father invites Mother
    inv_resp = client.post(
        "/api/v1/households/invite",
        headers=headers_father,
        json={
            "invitee_email": mother_email,
            "invitee_name": "Priya Sharma",
            "role": "adult",
            "relationship": "Mother",
        },
    )
    assert inv_resp.status_code == 201
    invite_code = inv_resp.json()["invite_code"]

    # Mother accepts invitation
    accept_resp = client.post(
        "/api/v1/households/invitations/accept",
        headers=headers_mother,
        json={"invite_code": invite_code},
    )
    assert accept_resp.status_code == 200
    updated_hh = accept_resp.json()
    mother_member = next(m for m in updated_hh["members"] if m["user_id"] == reg_mother.json()["user"]["id"])
    mother_member_id = mother_member["id"]

    today = date.today()
    overdue_d = (today - timedelta(days=2)).isoformat()
    upcoming_d = (today + timedelta(days=6)).isoformat()

    # 3. Create Obligations matching Prompt:
    # A. Electricity Bill (Father)
    client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers_father,
        json={
            "title": "Adani Electricity Bill",
            "amount": 2450.0,
            "category": "utilities",
            "due_date": upcoming_d,
            "assigned_member_id": father_member_id,
        },
    )

    # B. Insurance Renewal (Father, overdue)
    ins_resp = client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers_father,
        json={
            "title": "Star Health Insurance Renewal",
            "amount": 16800.0,
            "category": "insurance",
            "due_date": overdue_d,
            "priority": "critical",
            "assigned_member_id": father_member_id,
        },
    )
    ins_ob_id = ins_resp.json()["id"]

    # C. School Fee (Mother)
    client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers_father,
        json={
            "title": "Delhi Public School Fee",
            "amount": 38500.0,
            "category": "education",
            "due_date": upcoming_d,
            "assigned_member_id": mother_member_id,
        },
    )

    # D. Water Tax (Unassigned)
    unassigned_resp = client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers_father,
        json={
            "title": "Municipal Water Tax",
            "amount": 950.0,
            "category": "utilities",
            "due_date": (today + timedelta(days=3)).isoformat(),
        },
    )
    unassigned_id = unassigned_resp.json()["id"]

    # 4. Fetch Responsibility Intelligence
    resp_intel = client.get("/api/v1/sahay-daily/responsibility-intelligence", headers=headers_father)
    assert resp_intel.status_code == 200
    data = resp_intel.json()

    # 5. Verify Responsibility Structure
    assert data["total_obligations"] >= 4
    assert data["unassigned_count"] >= 1
    assert data["overdue_count"] >= 1
    assert len(data["member_workloads"]) >= 2

    # Check Father's & Mother's workloads
    father_wk = next(w for w in data["member_workloads"] if w["member_id"] == father_member_id)
    assert father_wk["total_obligations"] >= 2
    assert father_wk["overdue_obligations"] >= 1

    mother_wk = next(w for w in data["member_workloads"] if w["member_id"] == mother_member_id)
    assert mother_wk["total_obligations"] >= 1

    # Verify Transfer Suggestions exist
    assert len(data["transfer_suggestions"]) > 0

    # Verify Transfer Suggestion for Overdue Insurance or Unassigned Water Tax
    transfer_ob_ids = [s["obligation_id"] for s in data["transfer_suggestions"]]
    assert ins_ob_id in transfer_ob_ids or unassigned_id in transfer_ob_ids

    # 6. Execute One-Click Responsibility Transfer
    transfer_resp = client.post(
        f"/api/v1/sahay-daily/obligations/{ins_ob_id}/transfer",
        headers=headers_father,
        json={
            "target_member_id": mother_member_id,
            "reason": "Father is overloaded; transferred to Mother for prompt settlement.",
        },
    )
    assert transfer_resp.status_code == 200
    transferred_ob = transfer_resp.json()
    assert transferred_ob["assigned_member_id"] == mother_member_id
    assert "transferred" in transferred_ob.get("notes", "").lower()
