import logging
import socket
from datetime import datetime, timezone
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

logger = logging.getLogger("sahay.db")

engine: AsyncEngine | None = None
async_session_maker: async_sessionmaker[AsyncSession] | None = None
active_db_type: str = "unknown"


def is_postgres_available() -> bool:
    """Quick probe to see if postgres socket can be reached without hanging."""
    try:
        with socket.create_connection(("127.0.0.1", 5432), timeout=0.3):
            return True
    except (OSError, PermissionError, ConnectionRefusedError):
        return False


def switch_to_sqlite() -> AsyncEngine:
    global engine, async_session_maker, active_db_type
    logger.info("Initializing SQLite database for local development fallback...")
    engine = create_async_engine(
        settings.SQLITE_URL,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
    )
    active_db_type = "sqlite"
    async_session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return engine


def init_engine_sync() -> AsyncEngine:
    global engine, async_session_maker, active_db_type
    if engine is not None:
        return engine

    # Check whether PostgreSQL can be used
    if settings.DATABASE_URL.startswith("postgresql") and not settings.SQLITE_FALLBACK:
        # User strictly wants PostgreSQL
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            future=True,
            pool_pre_ping=True,
            connect_args={"timeout": 2.0},
        )
        active_db_type = "postgresql"
        async_session_maker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        return engine

    # Otherwise default to SQLite for local development unless explicit test succeeds
    return switch_to_sqlite()


def get_engine() -> AsyncEngine:
    global engine
    if engine is None:
        init_engine_sync()
    assert engine is not None
    return engine


def init_db_engine() -> AsyncEngine:
    return get_engine()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an asynchronous database session."""
    global async_session_maker
    if async_session_maker is None:
        get_engine()
    assert async_session_maker is not None

    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_health() -> dict:
    """Checks database connectivity and returns status metadata."""
    global active_db_type
    eng = get_engine()
    try:
        async with eng.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "dialect": eng.dialect.name,
            "mode": active_db_type,
            "note": "Connected to PostgreSQL" if active_db_type == "postgresql" else "Operating in local SQLite dev mode",
        }
    except Exception as exc:
        return {
            "status": "unhealthy",
            "error": str(exc),
            "dialect": eng.dialect.name if eng else "none",
        }
