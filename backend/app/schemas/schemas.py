from pydantic import BaseModel, EmailStr, HttpUrl, field_validator
from typing import Any
from datetime import datetime
from app.models.models import RiskLevel, ScreeningStatus


# ─── Candidate ───────────────────────────────────────────

class CandidateCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    linkedin_url: str | None = None
    instagram_url: str | None = None
    twitter_url: str | None = None
    facebook_url: str | None = None
    consent_given: bool

    @field_validator("consent_given")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Candidate consent is required before screening")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()

    @field_validator("instagram_url", "twitter_url", "facebook_url", "linkedin_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        """Convert empty string or placeholder to None."""
        if v is None:
            return None
        s = str(v).strip().lower()
        if s in ("", "tidak ada", "none", "-", "n/a", "na"):
            return None
        return str(v).strip()

    @field_validator("phone", mode="before")
    @classmethod
    def clean_phone(cls, v):
        if v is None:
            return None
        s = str(v).strip()
        if s in ("", "tidak ada", "none", "-"):
            return None
        return s


class CandidateResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None
    linkedin_url: str | None
    instagram_url: str | None
    twitter_url: str | None
    facebook_url: str | None
    consent_given: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Report ──────────────────────────────────────────────

class RiskScores(BaseModel):
    explicit_content: float = 0.0      # 0-100
    toxic_language: float = 0.0
    hate_speech: float = 0.0
    violence: float = 0.0
    extremism: float = 0.0
    professional_risk: float = 0.0


class FlaggedItem(BaseModel):
    platform: str
    content_snippet: str
    category: str
    severity: str  # low / medium / high
    url: str | None = None


class ScreeningReportResponse(BaseModel):
    id: str
    candidate_id: str
    status: ScreeningStatus
    overall_risk: RiskLevel | None
    risk_scores: dict[str, float] | None
    found_profiles: dict[str, Any] | None
    flagged_content: list[dict] | None
    ai_summary: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


# ─── Generic ─────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    data: Any | None = None