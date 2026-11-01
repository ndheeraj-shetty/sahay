import uuid
from datetime import date, timedelta
import pytest


def test_health_profile_lifecycle_and_daily_integration(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"health.owner.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register Owner
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Devendra Kulkarni"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. List Health Profiles (auto-creates profile for member)
    profiles_resp = client.get("/api/v1/health-shield/profiles", headers=headers)
    assert profiles_resp.status_code == 200
    profiles = profiles_resp.json()
    assert len(profiles) >= 1
    profile = profiles[0]
    profile_id = profile["id"]
    assert profile["member_name"] == "Devendra Kulkarni"

    # 3. Update Vitals & Insurance
    patch_resp = client.patch(
        f"/api/v1/health-shield/profiles/{profile_id}",
        headers=headers,
        json={
            "blood_group": "B+",
            "height_cm": 178.5,
            "weight_kg": 76.0,
            "preferred_hospital": "Apollo Hospital, Bannerghatta",
            "preferred_doctor": "Dr. R. K. Joshi",
            "doctor_phone": "+91 98450 11223",
            "insurance_provider": "HDFC ERGO Health",
            "insurance_policy_no": "HDFC-HLT-2026-8899",
            "organ_donor": True,
        },
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["blood_group"] == "B+"
    assert updated["insurance_policy_no"] == "HDFC-HLT-2026-8899"
    assert updated["organ_donor"] is True

    # 4. Add Critical Medical Condition
    cond_resp = client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/conditions",
        headers=headers,
        json={
            "name": "Type 2 Diabetes Mellitus",
            "diagnosed_date": "2020-04-15",
            "status": "managed",
            "is_critical": True,
            "notes": "Target HbA1c below 6.8%",
        },
    )
    assert cond_resp.status_code == 201
    cond = cond_resp.json()
    assert cond["name"] == "Type 2 Diabetes Mellitus"
    assert cond["is_critical"] is True

    # 5. Add Life-Threatening Allergy
    allergy_resp = client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/allergies",
        headers=headers,
        json={
            "allergen": "Penicillin",
            "category": "medication",
            "severity": "life_threatening",
            "reaction_description": "Anaphylaxis and respiratory distress",
            "is_life_threatening": True,
        },
    )
    assert allergy_resp.status_code == 201
    allergy = allergy_resp.json()
    assert allergy["allergen"] == "Penicillin"
    assert allergy["is_life_threatening"] is True

    # 6. Add Medicine with Refill Reminder Integration
    refill_due = date.today() + timedelta(days=25)
    med_resp = client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/medicines",
        headers=headers,
        json={
            "name": "Metformin Hydrochloride",
            "dosage": "500 mg",
            "frequency": "twice_daily",
            "timing": "after_food",
            "start_date": "2026-01-01",
            "refill_date": refill_due.isoformat(),
            "prescribed_by_doctor": "Dr. R. K. Joshi",
            "instructions": "Take with breakfast and dinner",
            "create_refill_reminder": True,
        },
    )
    assert med_resp.status_code == 201
    med = med_resp.json()
    assert med["name"] == "Metformin Hydrochloride"

    # Verify Sahay Daily integration: check that an obligation was created
    daily_resp = client.get("/api/v1/sahay-daily/obligations", headers=headers)
    assert daily_resp.status_code == 200
    daily_obs = daily_resp.json()
    refill_ob = next((o for o in daily_obs if "Metformin" in o["title"]), None)
    assert refill_ob is not None
    assert refill_ob["obligation_type"] == "health_task"
    assert refill_ob["due_date"] == refill_due.isoformat()

    # 7. Add Emergency Contact
    contact_resp = client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/emergency-contacts",
        headers=headers,
        json={
            "name": "Pooja Kulkarni",
            "relationship": "Spouse",
            "phone_number": "+91 98450 99887",
            "is_primary": True,
        },
    )
    assert contact_resp.status_code == 201
    contact = contact_resp.json()
    assert contact["name"] == "Pooja Kulkarni"
    assert contact["is_primary"] is True


def test_emergency_card_and_public_sharing(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"emergency.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Kamla Devi"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    profiles = client.get("/api/v1/health-shield/profiles", headers=headers).json()
    profile_id = profiles[0]["id"]

    # Set profile data
    client.patch(
        f"/api/v1/health-shield/profiles/{profile_id}",
        headers=headers,
        json={
            "blood_group": "O+",
            "preferred_hospital": "Fortis Hospital",
            "insurance_provider": "Care Health Insurance",
            "insurance_policy_no": "CARE-2026-1029",
        },
    )
    # Add allergy
    client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/allergies",
        headers=headers,
        json={
            "allergen": "Sulfa Drugs",
            "severity": "severe",
            "is_life_threatening": True,
        },
    )
    # Add condition
    client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/conditions",
        headers=headers,
        json={"name": "Hypertension", "is_critical": True, "status": "active"},
    )
    # Add emergency contact
    client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/emergency-contacts",
        headers=headers,
        json={
            "name": "Amit Sharma",
            "relationship": "Son",
            "phone_number": "+91 99887 76655",
            "is_primary": True,
        },
    )

    # 1. Fetch Emergency Card (Authenticated)
    card_resp = client.get(
        f"/api/v1/health-shield/profiles/{profile_id}/emergency-card",
        headers=headers,
    )
    assert card_resp.status_code == 200
    card = card_resp.json()
    assert card["patient_name"] == "Kamla Devi"
    assert card["blood_group"] == "O+"
    assert card["insurance_policy_no"] == "CARE-2026-1029"
    assert len(card["life_threatening_allergies"]) == 1
    assert card["life_threatening_allergies"][0]["allergen"] == "Sulfa Drugs"
    assert len(card["critical_conditions"]) == 1
    assert len(card["emergency_contacts"]) == 1

    # 2. Generate Public Emergency Share Token
    share_resp = client.post(
        f"/api/v1/health-shield/profiles/{profile_id}/emergency-share",
        headers=headers,
        json={"validity_hours": 12},
    )
    assert share_resp.status_code == 200
    share_data = share_resp.json()
    share_id = share_data["id"]
    share_token = share_data["share_token"]
    assert share_token is not None
    assert share_data["is_active"] is True

    # 3. Test Public Access (NO AUTH HEADERS - First Responder Simulation)
    pub_resp = client.get(f"/api/v1/health-shield/emergency/{share_token}")
    assert pub_resp.status_code == 200
    pub_card = pub_resp.json()
    assert pub_card["patient_name"] == "Kamla Devi"
    assert pub_card["blood_group"] == "O+"
    assert pub_card["emergency_contacts"][0]["phone_number"] == "+91 99887 76655"

    # 4. Revoke Share Link
    revoke_resp = client.post(
        f"/api/v1/health-shield/emergency-shares/{share_id}/revoke",
        headers=headers,
    )
    assert revoke_resp.status_code == 200

    # 5. Verify Revoked Link Fails with 404
    revoked_access = client.get(f"/api/v1/health-shield/emergency/{share_token}")
    assert revoked_access.status_code == 404
