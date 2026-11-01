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


def is_db_host_reachable(url: str, timeout: float = 1.0) -> bool:
    """Probes if the database host and port are accepting TCP connections."""
    try:
        without_scheme = url.split("://", 1)[-1]
        at_split = without_scheme.split("@", 1)
        host_port_part = at_split[-1].split("/")[0] if len(at_split) > 1 else without_scheme.split("/")[0]
        if ":" in host_port_part:
            host, port_str = host_port_part.split(":", 1)
            port = int(port_str)
        else:
            host = host_port_part
            port = 5432

        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def switch_to_sqlite() -> AsyncEngine:
    global engine, async_session_maker, active_db_type
    logger.info("Initializing SQLite database fallback...")
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

    # Check whether PostgreSQL can be used and host is reachable
    if settings.DATABASE_URL.startswith("postgresql"):
        if is_db_host_reachable(settings.DATABASE_URL, timeout=1.0):
            try:
                logger.info("Connecting to PostgreSQL database engine...")
                engine = create_async_engine(
                    settings.DATABASE_URL,
                    echo=False,
                    future=True,
                    pool_pre_ping=True,
                    pool_size=5,
                    max_overflow=10,
                    connect_args={"timeout": 5.0},
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
            except Exception as e:
                logger.warning(f"Could not initialize PostgreSQL engine: {e}")
                if settings.SQLITE_FALLBACK:
                    return switch_to_sqlite()
                raise e
        else:
            logger.info("PostgreSQL host not currently reachable.")
            if settings.SQLITE_FALLBACK:
                return switch_to_sqlite()

    # Otherwise default to SQLite
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
            "note": "Connected to PostgreSQL" if active_db_type == "postgresql" else "Operating in SQLite mode",
        }
    except Exception as exc:
        return {
            "status": "unhealthy",
            "error": str(exc),
            "dialect": eng.dialect.name if eng else "none",
        }
