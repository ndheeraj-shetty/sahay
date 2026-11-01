import io
import uuid
from datetime import date, timedelta
import pytest


def test_household_life_event_radar(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"radar.test.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register Owner
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Sanjay Sharma"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today()
    insurance_exp = (today + timedelta(days=50)).strftime("%d/%m/%Y")
    school_due = (today + timedelta(days=18)).strftime("%d/%m/%Y")
    bill_due = (today + timedelta(days=5)).isoformat()

    # 2. Upload Vehicle Insurance Policy (due in 50 days)
    car_policy_content = f"""
    Bajaj Allianz Car Insurance
    Policy No: BA-CAR-991204
    Vehicle: Honda City KA-01-MJ-2024
    Insured: Sanjay Sharma
    Expiry Date: {insurance_exp}
    Annual Premium: Rs. 14500
    IDV: Rs. 850000
    """.encode("utf-8")

    client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data={
            "title": "Honda City Car Insurance",
            "category": "financial",
            "access_level": "shared_adults",
            "tags": "vehicle,insurance,car",
        },
        files={"file": ("car_insurance.txt", io.BytesIO(car_policy_content), "text/plain")},
    )

    # 3. Upload School Fee Circular (due in 18 days)
    school_content = f"""
    Delhi Public School - Term 2 Fee Notice
    Student: Aryan Sharma (Class 8-A)
    Due Date: {school_due}
    Amount Due: Rs. 38500
    Pay before late fee deadline.
    """.encode("utf-8")

    client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data={
            "title": "DPS Term 2 School Fee Notice",
            "category": "household",
            "access_level": "shared_adults",
            "tags": "school,fee,education",
        },
        files={"file": ("school_fee.txt", io.BytesIO(school_content), "text/plain")},
    )

    # 4. Add an electricity bill obligation due in 5 days
    client.post(
        "/api/v1/sahay-daily/obligations",
        headers=headers,
        json={
            "title": "Tata Power Electricity Bill",
            "amount": 2150.0,
            "category": "utilities",
            "due_date": bill_due,
            "priority": "high",
            "recurrence": "monthly",
        },
    )

    # 5. Fetch Household Life-Event Radar Timeline
    radar_resp = client.get("/api/v1/sahay-daily/radar", headers=headers)
    assert radar_resp.status_code == 200, f"Radar fetch failed: {radar_resp.text}"
    radar_data = radar_resp.json()

    # Assertions
    assert radar_data["total_upcoming_events"] >= 3
    assert radar_data["next_90_days_outflow"] >= 30000.0
    assert len(radar_data["timeline"]) >= 2
    assert len(radar_data["radar_summary"]) > 0
    assert len(radar_data["predictive_alerts"]) > 0

    # Verify timeline bucket horizons
    horizon_keys = [b["horizon_key"] for b in radar_data["timeline"]]
    assert any(k in horizon_keys for k in ["urgent", "this_month", "upcoming"])

    # Find the car insurance radar event
    car_event = None
    for bucket in radar_data["timeline"]:
        for event in bucket["events"]:
            if "Car Insurance" in event["title"] or "Vehicle" in event["category"] or "insurance" in event["category"]:
                car_event = event
                break
        if car_event:
            break

    assert car_event is not None
    assert car_event["suggested_action"] is not None

    # 6. One-Click Create Obligation directly from Radar
    create_ob_resp = client.post(
        "/api/v1/sahay-daily/radar/create-obligation",
        headers=headers,
        json={
            "title": "Renew Honda City Insurance",
            "amount": car_event["estimated_amount"] or 14500.0,
            "category": "insurance",
            "due_date": car_event["target_date"],
            "source_document_id": car_event["source_document_id"],
            "priority": "high",
            "recurrence": "yearly",
            "notes": "Created via 1-click Radar action",
        },
    )
    assert create_ob_resp.status_code == 201
    created_ob = create_ob_resp.json()
    assert created_ob["title"] == "Renew Honda City Insurance"
    assert created_ob["status"] == "pending"
    assert created_ob["amount"] == (car_event["estimated_amount"] or 14500.0)
