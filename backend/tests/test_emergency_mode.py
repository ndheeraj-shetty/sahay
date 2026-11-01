import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.models.lakshya import GoalCategory, GoalPriority, GoalStatus


def test_emergency_mode_crisis_liquidity_and_reallocation(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"emergency.tester.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Emergency Admin"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. Create two goals: Car Goal (₹3,00,000 target, ₹1,50,000 saved) and House Goal (₹10,00,000 target, ₹4,00,000 saved)
    car_res = client.post(
        "/api/v1/lakshya/goals",
        json={
            "title": "New Car Purchase",
            "category": "vehicle_purchase",
            "target_amount": 300000.0,
            "target_date": (date.today() + timedelta(days=365)).isoformat(),
            "priority": "medium",
        },
        headers=headers,
    )
    assert car_res.status_code == 201
    car_id = car_res.json()["id"]

    # Deposit ₹1,50,000 into Car Goal
    dep1 = client.post(
        f"/api/v1/lakshya/goals/{car_id}/contributions",
        json={"amount": 150000.0, "payment_method": "UPI", "notes": "Car savings"},
        headers=headers,
    )
    assert dep1.status_code == 201

    house_res = client.post(
        "/api/v1/lakshya/goals",
        json={
            "title": "House Down Payment",
            "category": "home_down_payment",
            "target_amount": 1000000.0,
            "target_date": (date.today() + timedelta(days=730)).isoformat(),
            "priority": "high",
        },
        headers=headers,
    )
    assert house_res.status_code == 201
    house_id = house_res.json()["id"]

    # Deposit ₹4,00,000 into House Goal
    dep2 = client.post(
        f"/api/v1/lakshya/goals/{house_id}/contributions",
        json={"amount": 400000.0, "payment_method": "UPI", "notes": "House savings"},
        headers=headers,
    )
    assert dep2.status_code == 201

    # 2. Trigger Emergency Mode Reallocation for 5 Lakhs (₹500,000)
    realloc_res = client.post(
        "/api/v1/lakshya/emergency-mode/reallocate",
        json={
            "urgent_amount": 500000.0,
            "reason": "Pandemic Hospitalization & Medical Crisis",
        },
        headers=headers,
    )
    assert realloc_res.status_code == 200
    plan = realloc_res.json()

    assert plan["urgent_amount"] == 500000.0
    assert len(plan["reallocations"]) >= 2
    # Check that Car goal is mobilized
    car_item = next((item for item in plan["reallocations"] if item["goal_id"] == car_id), None)
    assert car_item is not None
    assert car_item["recommended_withdrawal"] > 0
    # Check that House goal is mobilized
    house_item = next((item for item in plan["reallocations"] if item["goal_id"] == house_id), None)
    assert house_item is not None
    assert house_item["recommended_withdrawal"] > 0

    assert "Emergency Mode Activated" in plan["advice_narrative"]
    assert "keep the money back" in plan["advice_narrative"].lower() or "restore" in plan["advice_narrative"].lower()
    assert len(plan["restoration_plan"]) >= 2

    # 3. Apply the emergency reallocation
    apply_res = client.post(
        "/api/v1/lakshya/emergency-mode/apply",
        json={
            "urgent_amount": 500000.0,
            "reason": "Pandemic Crisis",
            "withdrawals": [
                {"goal_id": car_id, "amount": car_item["recommended_withdrawal"]},
                {"goal_id": house_id, "amount": house_item["recommended_withdrawal"]},
            ],
        },
        headers=headers,
    )
    assert apply_res.status_code == 200
    assert "Emergency reallocation applied successfully" in apply_res.json()["message"]

    # Verify Car goal amount was reduced
    car_check = client.get(f"/api/v1/lakshya/goals/{car_id}", headers=headers)
    assert car_check.status_code == 200
    assert car_check.json()["current_amount"] < 150000.0

    # 4. Test AI Chat Guidance for Emergency Mode
    ai_res = client.post(
        "/api/v1/ai/chat",
        json={
            "query": "We are facing a pandemic emergency and urgently require 5 lakhs rupees for hospitalization. Our account does not have that much liquid money. Which saved goals should we take money from, and how should we restore them?",
        },
        headers=headers,
    )
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["role"] == "assistant"
    # AI response should offer reallocations and restoration
    content_lower = ai_data["content"].lower()
    assert "emergency" in content_lower
    assert any(term in content_lower for term in ["restore", "replenish", "keep", "back"])
