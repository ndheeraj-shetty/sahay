def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "SAHAY"
    assert data["status"] == "operational"
    assert data["api_v1"] == "/api/v1"


def test_api_v1_index(client):
    response = client.get("/api/v1/")
    assert response.status_code == 200
    data = response.json()
    assert "SAHAY API v1" in data["message"]
    assert "health" in data["endpoints"]


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "SAHAY"
    assert "database" in data
    assert data["database"]["status"] in ["healthy", "degraded"]


def test_system_status(client):
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "SAHAY"
    assert "Phase 1" in data["phase"]
    assert len(data["active_modules"]) > 0
