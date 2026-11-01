import uuid
from datetime import date, timedelta
import pytest


def test_goal_creation_and_milestones(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"lakshya.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Siddharth Joshi"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    target_date = date.today() + timedelta(days=365)

    # 1. Create Goal Vault
    create_resp = client.post(
        "/api/v1/lakshya/goals",
        headers=headers,
        json={
            "title": "Aarav Higher Education Fund",
            "description": "B.Tech Computer Science college fund",
            "category": "higher_education",
            "target_amount": 600000.0,
            "target_date": target_date.isoformat(),
            "priority": "critical",
        },
    )
    assert create_resp.status_code == 201
    goal = create_resp.json()
    assert goal["title"] == "Aarav Higher Education Fund"
    assert goal["target_amount"] == 600000.0
    assert goal["current_amount"] == 0.0
    assert goal["progress_percentage"] == 0.0

    # Verify auto-generated progression milestones (25, 50, 75, 100)
    assert len(goal["milestones"]) == 4
    milestones = goal["milestones"]
    assert milestones[0]["target_percentage"] == 25.0
    assert milestones[0]["target_amount"] == 150000.0
    assert milestones[0]["is_reached"] is False
    assert milestones[3]["target_percentage"] == 100.0
    assert milestones[3]["target_amount"] == 600000.0


def test_contributors_and_risk_analysis(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"risk.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Nitin Verma"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch current user's household membership id
    hh_resp = client.get("/api/v1/households", headers=headers)
    assert hh_resp.status_code == 200
    member_id = hh_resp.json()[0]["members"][0]["id"]

    target_date = date.today() + timedelta(days=365)  # 12 months

    # Create Goal
    create_resp = client.post(
        "/api/v1/lakshya/goals",
        headers=headers,
        json={
            "title": "Home Down Payment (SBI Housing)",
            "category": "home_down_payment",
            "target_amount": 1200000.0,
            "target_date": target_date.isoformat(),
            "priority": "high",
        },
    )
    goal_id = create_resp.json()["id"]

    # 1. Check Initial Risk (0 commitment -> behind / at risk)
    risk_resp1 = client.get(f"/api/v1/lakshya/goals/{goal_id}/risk", headers=headers)
    assert risk_resp1.status_code == 200
    risk1 = risk_resp1.json()
    assert risk1["remaining_months"] >= 11
    assert risk1["committed_monthly_savings"] == 0.0
    assert risk1["required_monthly_savings"] > 90000.0
    assert risk1["risk_level"] == "behind"
    assert len(risk1["recommendations"]) >= 1

    # 2. Add Contributor with High Commitment (₹110,000/mo >= required ₹100,000/mo)
    contrib_resp = client.post(
        f"/api/v1/lakshya/goals/{goal_id}/contributors",
        headers=headers,
        json={
            "member_id": member_id,
            "monthly_commitment_amount": 110000.0,
            "target_share_percentage": 100.0,
            "notes": "Salary allocation from primary account",
        },
    )
    assert contrib_resp.status_code == 201

    # 3. Check Risk After Commitment -> should become ON_TRACK
    risk_resp2 = client.get(f"/api/v1/lakshya/goals/{goal_id}/risk", headers=headers)
    assert risk_resp2.status_code == 200
    risk2 = risk_resp2.json()
    assert risk2["committed_monthly_savings"] == 110000.0
    assert risk2["risk_level"] == "on_track"


def test_contributions_and_milestone_progression(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"contrib.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Deepa Rao"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    create_resp = client.post(
        "/api/v1/lakshya/goals",
        headers=headers,
        json={
            "title": "Emergency Buffer Fund",
            "category": "emergency_fund",
            "target_amount": 200000.0,
            "target_date": (date.today() + timedelta(days=180)).isoformat(),
            "priority": "critical",
        },
    )
    goal_id = create_resp.json()["id"]

    # 1. Record First Contribution: ₹60,000 (Passes 25% milestone of ₹50,000)
    cb_resp = client.post(
        f"/api/v1/lakshya/goals/{goal_id}/contributions",
        headers=headers,
        json={
            "amount": 60000.0,
            "payment_method": "UPI",
            "transaction_reference": "UPI/948291/GPay",
            "notes": "Initial deposit from monthly savings",
        },
    )
    assert cb_resp.status_code == 201

    # Inspect goal
    goal_resp = client.get(f"/api/v1/lakshya/goals/{goal_id}", headers=headers)
    goal = goal_resp.json()
    assert goal["current_amount"] == 60000.0
    assert goal["progress_percentage"] == 30.0

    # Verify 25% milestone is now reached
    m25 = next(m for m in goal["milestones"] if m["target_percentage"] == 25.0)
    assert m25["is_reached"] is True
    assert m25["reached_at"] is not None

    # Verify 50% milestone is NOT yet reached
    m50 = next(m for m in goal["milestones"] if m["target_percentage"] == 50.0)
    assert m50["is_reached"] is False

    # 2. Record Withdrawal: ₹10,000 for unexpected medical bill
    w_resp = client.post(
        f"/api/v1/lakshya/goals/{goal_id}/withdrawals",
        headers=headers,
        json={"amount": 10000.0, "reason": "Immediate clinic medicine payment"},
    )
    assert w_resp.status_code == 201

    goal_resp2 = client.get(f"/api/v1/lakshya/goals/{goal_id}", headers=headers)
    assert goal_resp2.json()["current_amount"] == 50000.0

    # 3. Test Excessive Withdrawal Fails (e.g. ₹100,000 > ₹50,000)
    excess_w = client.post(
        f"/api/v1/lakshya/goals/{goal_id}/withdrawals",
        headers=headers,
        json={"amount": 100000.0, "reason": "Excessive amount"},
    )
    assert excess_w.status_code == 400

    # 4. Test Lakshya Overview
    overview_resp = client.get("/api/v1/lakshya/overview", headers=headers)
    assert overview_resp.status_code == 200
    ov = overview_resp.json()
    assert ov["total_goals_count"] >= 1
    assert ov["total_saved_amount"] >= 50000.0
