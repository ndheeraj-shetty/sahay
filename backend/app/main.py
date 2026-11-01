import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db_engine
from app.db.init_db import init_db

# Setup logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sahay")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database engine and tables
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.APP_ENV})")
    init_db_engine()
    await init_db()
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    description="SAHAY — The Household Life-Admin OS Backend API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS middleware: allow all origins with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "type": type(exc).__name__},
    )


# Root endpoint
@app.get("/", tags=["System"])
async def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "The Household Life-Admin OS",
        "version": settings.APP_VERSION,
        "status": "operational",
        "api_v1": settings.API_V1_STR,
        "documentation": "/docs",
    }


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
