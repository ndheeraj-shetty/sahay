import uuid
from fastapi.testclient import TestClient


def test_auth_owner_and_family_member_and_password_reset(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"owner.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register as Household Owner
    reg_owner = client.post(
        "/api/v1/auth/register",
        json={
            "email": owner_email,
            "password": pwd,
            "full_name": "Ramesh Sharma",
            "household_name": "Sharma Villa",
            "is_owner": True,
        },
    )
    assert reg_owner.status_code == 201
    owner_data = reg_owner.json()
    assert owner_data["primary_household"]["name"] == "Sharma Villa"
    assert owner_data["primary_household"]["role"] == "owner"
    owner_headers = {"Authorization": f"Bearer {owner_data['access_token']}"}

    # 2. Owner generates an invite code for a family member
    inv_res = client.post(
        "/api/v1/households/invite",
        json={
            "invitee_email": f"daughter.{suffix}@example.com",
            "invitee_name": "Pooja Sharma",
            "role": "adult",
            "relationship": "Daughter",
        },
        headers=owner_headers,
    )
    assert inv_res.status_code == 201
    invite_code = inv_res.json()["invite_code"]
    assert invite_code is not None

    # 3. Family Member registers using the invite code
    member_email = f"pooja.{suffix}@example.com"
    reg_member = client.post(
        "/api/v1/auth/register",
        json={
            "email": member_email,
            "password": "Password456!",
            "full_name": "Pooja Sharma",
            "invite_code": invite_code,
            "is_owner": False,
        },
    )
    assert reg_member.status_code == 201
    member_data = reg_member.json()
    # Member belongs to the same Sharma Villa household!
    assert member_data["primary_household"]["id"] == owner_data["primary_household"]["id"]
    assert member_data["primary_household"]["role"] == "adult"

    # 4. Forgot password & reset password
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": member_email},
    )
    assert forgot_res.status_code == 200
    assert "123456" in forgot_res.json()["message"]

    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": member_email,
            "reset_code": "123456",
            "new_password": "NewSecretPassword123!",
        },
    )
    assert reset_res.status_code == 200

    # 5. Login with new password
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": member_email, "password": "NewSecretPassword123!"},
    )
    assert login_res.status_code == 200
