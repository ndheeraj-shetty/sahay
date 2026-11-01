from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/", summary="API V1 Index")
async def api_v1_index():
    return {
        "message": f"Welcome to {settings.APP_NAME} API v1",
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "endpoints": {
            "health": f"{settings.API_V1_STR}/health",
            "status": f"{settings.API_V1_STR}/status",
        },
    }
