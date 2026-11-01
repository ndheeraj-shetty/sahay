import io
import uuid
import pytest


def test_explainable_ai_document_assistant(client):
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"explainable.{suffix}@example.com"
    pwd = "Password123!"

    # 1. Register Owner
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": owner_email, "password": pwd, "full_name": "Rohan Gupta"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Health Insurance Policy
    policy_content = b"""
    Star Health and Allied Insurance Company Limited
    Policy Certificate: Star Comprehensive Health Insurance
    Policy Number: STAR-HLTH-2026-8812
    Insured Person: Rohan Gupta
    Policy Expiry: 15/12/2026
    Sum Insured: Rs. 500000
    Annual Premium: Rs. 15400
    """
    client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data={
            "title": "Health Insurance Policy",
            "category": "financial",
            "access_level": "shared_adults",
            "tags": "insurance,health,star",
        },
        files={"file": ("Health_Insurance_Policy.pdf", io.BytesIO(policy_content), "text/plain")},
    )

    # 3. Query: "What is the expiry date of our health insurance?"
    query_resp = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={"query": "What is the expiry date of our health insurance?"},
    )
    assert query_resp.status_code == 200
    ans = query_resp.json()

    # Verify Explainable AI Responses
    content = ans["content"]
    assert "15/12/2026" in content or "15 December 2026" in content
    assert "Health_Insurance_Policy.pdf" in content or "Health Insurance Policy" in content
    assert "Evidence" in content
    assert "Confidence" in content

    # Verify Citations Structure
    assert len(ans["citations"]) > 0
    doc_cit = next(c for c in ans["citations"] if c["source_type"] == "document")
    assert doc_cit["file_name"] == "Health_Insurance_Policy.pdf"
    assert doc_cit["page_number"] is not None
    assert doc_cit["confidence_score"] is not None
    assert doc_cit["evidence"] is not None

    # 4. Query about MISSING information: "What is our passport expiry date?"
    missing_resp = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={"query": "What is our passport expiry date?"},
    )
    assert missing_resp.status_code == 200
    missing_ans = missing_resp.json()
    assert "I couldn't verify this information from your uploaded documents" in missing_ans["content"]
