from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


def utc_now():
    return datetime.now(timezone.utc)


class DatabaseHealth(BaseModel):
    status: str
    dialect: Optional[str] = None
    mode: Optional[str] = None
    note: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    app_env: str
    app_version: str
    timestamp: datetime = Field(default_factory=utc_now)
    database: DatabaseHealth


class SystemStatusResponse(BaseModel):
    name: str
    version: str
    phase: str
    active_modules: list[str]
    system_time: datetime = Field(default_factory=utc_now)
