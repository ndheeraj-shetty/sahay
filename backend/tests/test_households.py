import uuid
import pytest


def test_household_and_invitation_lifecycle(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"owner.{suffix}@example.com"
    elder_email = f"elder.{suffix}@example.com"
    pwd = "Password123!"
    r1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": owner_email,
            "password": pwd,
            "full_name": "Vikram Malhotra",
            "household_name": "Malhotra Family House",
        },
    )
    assert r1.status_code == 201
    owner_token = r1.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # 2. Get current household
    cur_h_resp = client.get("/api/v1/households/current", headers=owner_headers)
    assert cur_h_resp.status_code == 200
    household = cur_h_resp.json()
    assert household["name"] == "Malhotra Family House"
    assert household["my_role"] == "owner"
    assert len(household["members"]) == 1

    # 3. Invite a family member as 'elder'
    invite_resp = client.post(
        "/api/v1/households/invite",
        headers=owner_headers,
        json={
            "invitee_email": elder_email,
            "invitee_name": "Satish Malhotra",
            "role": "elder",
            "relationship": "Grandfather",
        },
    )
    assert invite_resp.status_code == 201
    invite_data = invite_resp.json()
    assert invite_data["role"] == "elder"
    assert invite_data["status"] == "pending"
    invite_code = invite_data["invite_code"]

    # 4. List pending invitations
    invs_resp = client.get("/api/v1/households/invitations", headers=owner_headers)
    assert invs_resp.status_code == 200
    assert len(invs_resp.json()) == 1

    # 5. Register the invited user
    r2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": elder_email,
            "password": pwd,
            "full_name": "Satish Malhotra",
        },
    )
    assert r2.status_code == 201
    elder_token = r2.json()["access_token"]
    elder_headers = {"Authorization": f"Bearer {elder_token}"}

    # 6. Invited user accepts invitation
    accept_resp = client.post(
        "/api/v1/households/invitations/accept",
        headers=elder_headers,
        json={"invite_code": invite_code},
    )
    assert accept_resp.status_code == 200
    joined_h = accept_resp.json()
    assert joined_h["name"] == "Malhotra Family House"
    assert joined_h["my_role"] == "elder"
    assert len(joined_h["members"]) == 2

    # Verify members list
    members_resp = client.get(
        "/api/v1/households/members",
        headers={"Authorization": f"Bearer {owner_token}", "X-Household-ID": household["id"]},
    )
    assert members_resp.status_code == 200
    members = members_resp.json()
    assert len(members) == 2
    roles = {m["email"]: m["role"] for m in members}
    assert roles[owner_email] == "owner"
    assert roles[elder_email] == "elder"
