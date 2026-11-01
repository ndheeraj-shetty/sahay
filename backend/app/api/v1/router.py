from fastapi import APIRouter
from app.api.v1.endpoints import (
    ai_assistant,
    auth,
    document_doctor,
    documents,
    health,
    health_shield,
    households,
    lakshya,
    root,
    sahay_daily,
    shield,
)

api_router = APIRouter()

api_router.include_router(root.router, tags=["API Root"])
api_router.include_router(health.router, tags=["System & Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profile"])
api_router.include_router(households.router, prefix="/households", tags=["Household & Members"])
api_router.include_router(documents.router, prefix="/documents", tags=["Family Vault"])
api_router.include_router(document_doctor.router, prefix="/document-doctor", tags=["Document Doctor"])
api_router.include_router(sahay_daily.router, prefix="/sahay-daily", tags=["Sahay Daily"])
api_router.include_router(health_shield.router, prefix="/health-shield", tags=["Health Shield"])
api_router.include_router(lakshya.router, prefix="/lakshya", tags=["Lakshya Goal Vaults"])
api_router.include_router(ai_assistant.router, prefix="/ai", tags=["Sahay AI Assistant"])
api_router.include_router(shield.router, prefix="/security", tags=["Sahay Shield"])
