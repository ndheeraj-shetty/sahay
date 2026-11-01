import logging
from sqlalchemy import text
from app.db.base import Base
from app.db.session import get_engine
import app.models  # Ensure all models are imported so Base.metadata knows about them

logger = logging.getLogger("sahay.db")


async def init_db():
    engine = get_engine()
    try:
        async with engine.begin() as conn:
            # Create tables if they do not exist
            await conn.run_sync(Base.metadata.create_all)

            # Safe column additions for existing tables
            try:
                await conn.execute(text("ALTER TABLE documents ADD COLUMN is_encrypted BOOLEAN DEFAULT 1"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE documents ADD COLUMN encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM'"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE medicines ADD COLUMN approx_price FLOAT DEFAULT 0.0"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE household_money_profiles ADD COLUMN rent_expense FLOAT DEFAULT 18000.0"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE household_money_profiles ADD COLUMN groceries_expense FLOAT DEFAULT 12000.0"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE household_money_profiles ADD COLUMN utilities_expense FLOAT DEFAULT 5000.0"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE household_money_profiles ADD COLUMN other_expenses FLOAT DEFAULT 5000.0"))
            except Exception:
                pass

        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.error(f"Error initializing database tables: {exc}")
