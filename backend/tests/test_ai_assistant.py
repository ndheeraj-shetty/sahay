import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from app.models.vault import Document, DocumentAccessLevel
from app.models.daily import (
    Obligation,
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
)
from app.models.health import Allergy, AllergySeverity, HealthProfile
from app.models.lakshya import GoalCategory, GoalStatus, GoalVault


def test_ai_chat_and_citations(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"ai.owner.{suffix}@example.com"
    pwd = "Password123!"

    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "AI Test Owner"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. Ask general overview query
    chat_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "Hello Sahay, what can you help me with?"},
        headers=headers,
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert data["role"] == "assistant"
    assert "Sahay Household AI Assistant" in data["content"]
    assert "Family Vault" in data["content"]

    # 2. Add an obligation
    due_d = (date.today() + timedelta(days=3)).isoformat()
    ob_res = client.post(
        "/api/v1/sahay-daily/obligations",
        json={
            "title": "Adani Electricity Bill",
            "amount": 3400.0,
            "category": "utilities",
            "due_date": due_d,
            "priority": "high",
            "recurrence": "monthly",
            "biller_or_payee": "Adani Electricity",
        },
        headers=headers,
    )
    assert ob_res.status_code == 201

    # 3. Query bills -> should return obligation citations
    chat_bills = client.post(
        "/api/v1/ai/chat",
        json={"query": "What bills are due this month?"},
        headers=headers,
    )
    assert chat_bills.status_code == 200
    bills_data = chat_bills.json()
    assert "Adani Electricity Bill" in bills_data["content"]
    assert any(c["source_type"] == "obligation" for c in bills_data["citations"])


def test_ai_action_proposal_and_confirmation(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"action.tester.{suffix}@example.com",
            "password": "Password123!",
            "full_name": "Action Tester",
        },
    )
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # 1. Ask AI to add a bill -> triggers CREATE_OBLIGATION action proposal
    chat_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "Please add bill of 1800 for WiFi broadband"},
        headers=headers,
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["suggested_action"] is not None
    action = chat_data["suggested_action"]
    assert action["action_type"] == "create_obligation"
    assert action["status"] == "pending"
    assert action["action_payload"]["amount"] == 1800.0

    action_id = action["id"]

    # 2. Confirm the action
    conf_res = client.post(
        "/api/v1/ai/actions/confirm",
        json={"action_id": action_id, "confirmed": True},
        headers=headers,
    )
    assert conf_res.status_code == 200
    conf_data = conf_res.json()
    assert conf_data["status"] == "executed"
    assert conf_data["result"]["title"] == "WiFi Internet Bill"

    # 3. Verify the obligation now exists in Sahay Daily
    today_res = client.get("/api/v1/sahay-daily/today", headers=headers)
    assert today_res.status_code == 200
    today_data = today_res.json()
    all_items = (
        today_data.get("critical", [])
        + today_data.get("due_today", [])
        + today_data.get("due_soon", [])
        + today_data.get("upcoming", [])
    )
    assert any(o["title"] == "WiFi Internet Bill" for o in all_items)


def test_ai_action_rejection(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"reject.tester.{suffix}@example.com",
            "password": "Password123!",
            "full_name": "Reject Tester",
        },
    )
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # Trigger action proposal
    chat_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "Add bill of 500 for water"},
        headers=headers,
    )
    assert chat_res.status_code == 200
    action_id = chat_res.json()["suggested_action"]["id"]

    # Reject action
    reject_res = client.post(
        "/api/v1/ai/actions/confirm",
        json={"action_id": action_id, "confirmed": False},
        headers=headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"


def test_conversations_listing_and_deletion(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"conv.tester.{suffix}@example.com",
            "password": "Password123!",
            "full_name": "Conv Tester",
        },
    )
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # Chat 1
    chat_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "What is our household budget?"},
        headers=headers,
    )
    assert chat_res.status_code == 200

    # List conversations
    convs_res = client.get("/api/v1/ai/conversations", headers=headers)
    assert convs_res.status_code == 200
    convs = convs_res.json()
    assert len(convs) >= 1
    conv_id = convs[0]["id"]

    # Get conversation details
    detail_res = client.get(f"/api/v1/ai/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    assert len(detail_res.json()["messages"]) >= 2  # user + assistant

    # Delete conversation
    del_res = client.delete(f"/api/v1/ai/conversations/{conv_id}", headers=headers)
    assert del_res.status_code == 204


def test_ai_income_and_budget_advice_and_update(client: TestClient):
    suffix = uuid.uuid4().hex[:6]
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"budget.tester.{suffix}@example.com",
            "password": "Password123!",
            "full_name": "Budget Tester",
        },
    )
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # 1. Ask about budget and savings advice
    chat_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "What is our monthly income and savings capacity?"},
        headers=headers,
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert ("Expected Monthly Income" in data["content"] or "85,000" in data["content"] or "income" in data["content"].lower())
    assert len(data["content"]) > 20
    assert any(c["source_type"] == "money_profile" for c in data["citations"])

    # 2. Ask affordability question
    afford_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "Can we afford to save 10000 for a vacation goal?"},
        headers=headers,
    )
    assert afford_res.status_code == 200
    afford_content = afford_res.json()["content"].lower()
    assert any(w in afford_content for w in ["afford", "analysis", "vacation", "surplus", "save", "10,000", "10000"])

    # 3. Update income via AI action proposal
    update_res = client.post(
        "/api/v1/ai/chat",
        json={"query": "Set our monthly income to 125000 and savings target to 25000"},
        headers=headers,
    )
    assert update_res.status_code == 200
    update_data = update_res.json()
    assert update_data["suggested_action"] is not None
    action = update_data["suggested_action"]
    assert action["action_type"] == "update_money_profile"
    assert action["action_payload"]["expected_monthly_income"] == 125000.0

    # 4. Confirm update action
    conf_res = client.post(
        "/api/v1/ai/actions/confirm",
        json={"action_id": action["id"], "confirmed": True},
        headers=headers,
    )
    assert conf_res.status_code == 200
    assert conf_res.json()["status"] == "executed"

    # 5. Verify the updated money profile in Sahay Daily
    money_res = client.get("/api/v1/sahay-daily/money", headers=headers)
    assert money_res.status_code == 200
    assert money_res.json()["expected_income"] == 125000.0
    assert money_res.json()["planned_savings"] == 25000.0

