import io
import uuid
from datetime import date, timedelta
import pytest


def test_obligation_lifecycle_and_today_dashboard(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"daily.owner.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register User
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Aarav Patel"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today()

    # 2. Create Obligations
    # A: Due Today - Internet Bill
    ob1_res = client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers,
        json={
            "title": "Airtel Fiber Broadband",
            "obligation_type": "bill",
            "category": "utility",
            "biller_or_payee": "Airtel",
            "amount": 1179.0,
            "currency": "INR",
            "due_date": today.isoformat(),
            "priority": "high",
            "recurrence": "monthly",
        },
    )
    assert ob1_res.status_code == 201
    ob1 = ob1_res.json()
    ob1_id = ob1["id"]
    assert ob1["amount"] == 1179.0
    assert ob1["days_until_due"] == 0

    # B: Due in 4 days - Society Maintenance
    ob2_res = client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers,
        json={
            "title": "Apartment Society Maintenance",
            "obligation_type": "bill",
            "category": "housing",
            "biller_or_payee": "Palm Heights HOA",
            "amount": 4500.0,
            "currency": "INR",
            "due_date": (today + timedelta(days=4)).isoformat(),
            "priority": "medium",
            "recurrence": "monthly",
        },
    )
    assert ob2_res.status_code == 201
    ob2_id = ob2_res.json()["id"]

    # C: Due in 20 days - Car EMI
    ob3_res = client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers,
        json={
            "title": "HDFC Car Loan EMI",
            "obligation_type": "emi",
            "category": "loan",
            "biller_or_payee": "HDFC Bank",
            "amount": 14200.0,
            "currency": "INR",
            "due_date": (today + timedelta(days=20)).isoformat(),
            "priority": "critical",
            "recurrence": "monthly",
        },
    )
    assert ob3_res.status_code == 201
    ob3_id = ob3_res.json()["id"]

    # 3. Verify Today View Dashboard
    today_resp = client.get("/api/v1/sahay-daily/today", headers=headers)
    assert today_resp.status_code == 200
    today_data = today_resp.json()
    assert today_data["total_obligations_count"] == 3
    assert len(today_data["due_today"]) == 1
    assert today_data["due_today"][0]["title"] == "Airtel Fiber Broadband"
    assert len(today_data["due_soon"]) == 1
    assert today_data["due_soon"][0]["title"] == "Apartment Society Maintenance"
    assert len(today_data["upcoming"]) == 1
    assert today_data["due_today_count"] == 1

    # 4. Snooze an obligation
    snooze_resp = client.post(
        f"/api/v1/sahay-daily/obligations/{ob2_id}/snooze",
        headers=headers,
        json={"snooze_days": 5, "reason": "Salary arrives on Friday"},
    )
    assert snooze_resp.status_code == 200
    assert snooze_resp.json()["status"] == "snoozed"

    # Verify Today View reflects snoozed
    today_resp2 = client.get("/api/v1/sahay-daily/today", headers=headers)
    today_data2 = today_resp2.json()
    assert len(today_data2["snoozed"]) == 1
    assert today_data2["snoozed"][0]["id"] == ob2_id

    # 5. Mark as Paid (with automatic recurring next-cycle creation)
    pay_resp = client.post(
        f"/api/v1/sahay-daily/obligations/{ob1_id}/pay",
        headers=headers,
        json={
            "paid_amount": 1179.0,
            "payment_reference": "UPI/428190281/GPay",
            "create_next_recurrence": True,
        },
    )
    assert pay_resp.status_code == 200
    pay_data = pay_resp.json()
    assert pay_data["status"] == "paid"
    assert pay_data["payment_reference"] == "UPI/428190281/GPay"

    # Today view should show Airtel in completed list
    today_resp3 = client.get("/api/v1/sahay-daily/today", headers=headers)
    today_data3 = today_resp3.json()
    assert any(item["id"] == ob1_id for item in today_data3["completed"])


def test_calendar_and_money_dashboard(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"finance.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Meera Sen"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    today = date.today()

    # Add bills in current month
    client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers,
        json={
            "title": "Health Insurance Premium",
            "obligation_type": "insurance",
            "category": "health",
            "amount": 8000.0,
            "currency": "INR",
            "due_date": today.isoformat(),
            "priority": "high",
            "recurrence": "yearly",
        },
    )

    client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers,
        json={
            "title": "Groceries & Milk Basket",
            "obligation_type": "bill",
            "category": "groceries",
            "amount": 12000.0,
            "currency": "INR",
            "due_date": today.isoformat(),
            "priority": "medium",
            "recurrence": "monthly",
        },
    )

    # 1. Test Calendar Endpoint
    cal_resp = client.get(
        f"/api/v1/sahay-daily/calendar?month={today.month}&year={today.year}",
        headers=headers,
    )
    assert cal_resp.status_code == 200
    cal_data = cal_resp.json()
    assert cal_data["month"] == today.month
    assert cal_data["year"] == today.year
    assert cal_data["total_count"] >= 2
    assert cal_data["total_amount"] >= 20000.0

    # 2. Update Household Money Profile
    profile_resp = client.post(
        "/api/v1/sahay-daily/money-profile",
        headers=headers,
        json={
            "expected_monthly_income": 95000.0,
            "planned_monthly_savings": 25000.0,
            "notes": "Main household budget",
        },
    )
    assert profile_resp.status_code == 200
    profile = profile_resp.json()
    assert profile["expected_monthly_income"] == 95000.0

    # 3. Test Money Dashboard Endpoint
    money_resp = client.get("/api/v1/sahay-daily/money", headers=headers)
    assert money_resp.status_code == 200
    money_data = money_resp.json()
    assert money_data["expected_income"] == 95000.0
    assert money_data["total_obligations"] >= 20000.0
    assert money_data["projected_balance"] == 95000.0 - money_data["total_obligations"] - money_data["planned_savings"]
    assert len(money_data["category_breakdown"]) >= 2


def test_document_doctor_to_obligation_linkage(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"doc.link.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Kavita Rao"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload MSEB bill
    sample_bill_content = b"""
    MAHADISCOM - Electricity Bill
    Consumer No: 02847192841
    Total Amount Due: Rs. 2480.00
    Due Date: 20-Nov-2026
    """
    upload_resp = client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data={"title": "MSEB Nov 2026 Bill", "category": "household"},
        files={"file": ("bill.pdf", io.BytesIO(sample_bill_content), "application/pdf")},
    )
    doc_id = upload_resp.json()["id"]

    # Verify and confirm as obligation
    verify_resp = client.post(
        f"/api/v1/document-doctor/verify/{doc_id}",
        headers=headers,
        json={
            "confirmed_fields": [
                {"field_name": "biller_name", "confirmed_value": "MSEB Electricity"},
                {"field_name": "amount", "confirmed_value": "2480.00"},
                {"field_name": "due_date", "confirmed_value": "2026-11-20"},
                {"field_name": "consumer_number", "confirmed_value": "02847192841"},
            ],
            "confirm_as_obligation": True,
        },
    )
    assert verify_resp.status_code == 200

    # Verify obligation was automatically registered in Sahay Daily!
    obs_resp = client.get("/api/v1/sahay-daily/obligations", headers=headers)
    assert obs_resp.status_code == 200
    obs = obs_resp.json()
    assert len(obs) >= 1
    doc_ob = next((o for o in obs if o["source_document_id"] == doc_id), None)
    assert doc_ob is not None
    assert doc_ob["amount"] == 2480.0
    assert "MSEB" in doc_ob["title"]
