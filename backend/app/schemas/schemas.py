from pydantic import BaseModel, field_validator
from typing import Any
from datetime import datetime
from app.models.models import RiskLevel, MonitoringStatus


# ─── Issue ───────────────────────────────────────────

class IssueCreate(BaseModel):
    keyword: str
    instagram_url: str | None = None
    twitter_url: str | None = None
    facebook_url: str | None = None
    tiktok_url: str | None = None
    youtube_url: str | None = None
    consent_given: bool = True

    @field_validator("keyword")
    @classmethod
    def keyword_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Keyword tidak boleh kosong")
        return v.strip()

    @field_validator("instagram_url", "twitter_url", "facebook_url", "tiktok_url", "youtube_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v is None:
            return None
        s = str(v).strip().lower()
        if s in ("", "tidak ada", "none", "-", "n/a", "na"):
            return None
        return str(v).strip()


class IssueResponse(BaseModel):
    id: str
    keyword: str
    instagram_url: str | None
    twitter_url: str | None
    facebook_url: str | None
    tiktok_url: str | None
    youtube_url: str | None
    consent_given: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Report ──────────────────────────────────────────────

class RiskScores(BaseModel):
    explicit_content: float = 0.0
    toxic_language: float = 0.0
    hate_speech: float = 0.0
    violence: float = 0.0
    extremism: float = 0.0
    misinformation: float = 0.0


class FlaggedItem(BaseModel):
    platform: str
    content_snippet: str
    category: str
    severity: str  # low / medium / high
    url: str | None = None


class AssessmentUpdate(BaseModel):
    assessment_status: str  # relevant | irrelevant


class MonitoringReportResponse(BaseModel):
    id: str
    issue_id: str
    status: MonitoringStatus
    overall_risk: RiskLevel | None
    risk_scores: dict[str, float] | None
    found_profiles: dict[str, Any] | None
    flagged_content: list[dict] | None
    ai_summary: str | None
    created_at: datetime
    completed_at: datetime | None
    assessment_status: str | None = None
    assessed_by: str | None = None
    assessed_by_name: str | None = None
    assessed_at: datetime | None = None

    model_config = {"from_attributes": True}


# ─── Generic ─────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    data: Any | None = None


# ─── User Management ─────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "analyst"

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = None
    is_active: bool | None = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}
