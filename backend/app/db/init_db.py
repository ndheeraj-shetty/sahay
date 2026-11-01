import asyncio
import logging
from sqlalchemy import text
from app.db.base import Base
from app.db.session import get_engine, switch_to_sqlite, active_db_type, is_db_host_reachable
from app.core.config import settings
import app.models  # Ensure all models are imported so Base.metadata knows about them

logger = logging.getLogger("sahay.db")


async def init_db():
    retries = 5
    for attempt in range(1, retries + 1):
        try:
            engine = get_engine()
            # 1. Create all schema tables
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            # 2. Safe dialect-specific alterations in isolated blocks
            if engine.dialect.name == "sqlite":
                for sql_stmt in [
                    "ALTER TABLE documents ADD COLUMN is_encrypted BOOLEAN DEFAULT 1",
                    "ALTER TABLE documents ADD COLUMN encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM'",
                    "ALTER TABLE medicines ADD COLUMN approx_price FLOAT DEFAULT 0.0",
                    "ALTER TABLE household_money_profiles ADD COLUMN rent_expense FLOAT DEFAULT 18000.0",
                    "ALTER TABLE household_money_profiles ADD COLUMN groceries_expense FLOAT DEFAULT 12000.0",
                    "ALTER TABLE household_money_profiles ADD COLUMN utilities_expense FLOAT DEFAULT 5000.0",
                    "ALTER TABLE household_money_profiles ADD COLUMN other_expenses FLOAT DEFAULT 5000.0",
                ]:
                    try:
                        async with engine.begin() as conn:
                            await conn.execute(text(sql_stmt))
                    except Exception:
                        pass

            logger.info("Database tables initialized and verified successfully.")
            return
        except Exception as exc:
            logger.warning(f"Database initialization attempt {attempt}/{retries} failed: {exc}")
            if attempt < retries:
                await asyncio.sleep(2)
            else:
                if settings.SQLITE_FALLBACK and active_db_type != "sqlite":
                    logger.warning("Falling back to local SQLite database...")
                    try:
                        sqlite_engine = switch_to_sqlite()
                        async with sqlite_engine.begin() as conn:
                            await conn.run_sync(Base.metadata.create_all)
                        logger.info("Fallback SQLite database initialized successfully.")
                    except Exception as sq_exc:
                        logger.error(f"Fallback SQLite error: {sq_exc}")
                else:
                    logger.error(f"Database initialization failed: {exc}")
