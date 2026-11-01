from fastapi import APIRouter
from app.core.config import settings
from app.db.session import check_database_health
from app.schemas.health import HealthResponse, SystemStatusResponse, DatabaseHealth

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Application and Database Health Check")
async def get_health() -> HealthResponse:
    db_status = await check_database_health()
    return HealthResponse(
        status="ok" if db_status.get("status") == "healthy" else "degraded",
        app_name=settings.APP_NAME,
        app_env=settings.APP_ENV,
        app_version=settings.APP_VERSION,
        database=DatabaseHealth(**db_status),
    )


@router.get("/status", response_model=SystemStatusResponse, summary="System Phase Status")
async def get_status() -> SystemStatusResponse:
    return SystemStatusResponse(
        name=settings.APP_NAME,
        version=settings.APP_VERSION,
        phase="Phase 1: Application Foundation",
        active_modules=[
            "Application Foundation",
            "API Architecture (v1)",
            "Database Connectivity",
            "Responsive Web Shell",
        ],
    )
