import uuid
import pytest


def test_register_and_login_workflow(client):
    suffix = uuid.uuid4().hex[:6]
    email = f"rajesh.{suffix}@example.com"
    password = "SecurePassword123!"
    full_name = "Rajesh Sharma"

    # 1. Register user
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
            "phone": "+919876543210",
            "household_name": "Sharma Household",
        },
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["primary_household"]["name"] == "Sharma Household"
    assert reg_data["primary_household"]["role"] == "owner"

    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get /auth/me
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == email
    assert me_data["full_name"] == full_name

    # 3. Duplicate registration should fail
    dup_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
        },
    )
    assert dup_resp.status_code == 400

    # 4. Login with wrong password should fail
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # 5. Login with right password
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password, "device_info": "Firefox on Windows"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["user"]["id"] == reg_data["user"]["id"]

    # 6. Check sessions
    sess_resp = client.get("/api/v1/auth/sessions", headers=headers)
    assert sess_resp.status_code == 200
    sessions = sess_resp.json()
    assert len(sessions) >= 2  # registration session + login session
