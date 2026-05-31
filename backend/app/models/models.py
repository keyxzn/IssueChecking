from sqlalchemy import String, Text, Float, Boolean, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.core.database import Base
import enum
import uuid


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ScreeningStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    linkedin_url: Mapped[str | None] = mapped_column(Text)
    instagram_url: Mapped[str | None] = mapped_column(Text)
    twitter_url: Mapped[str | None] = mapped_column(Text)
    facebook_url: Mapped[str | None] = mapped_column(Text)
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship
    reports: Mapped[list["ScreeningReport"]] = relationship("ScreeningReport", back_populates="candidate")


class ScreeningReport(Base):
    __tablename__ = "screening_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id"), nullable=False)
    status: Mapped[ScreeningStatus] = mapped_column(SAEnum(ScreeningStatus), default=ScreeningStatus.pending)
    overall_risk: Mapped[RiskLevel | None] = mapped_column(SAEnum(RiskLevel))
    risk_scores: Mapped[dict | None] = mapped_column(JSON)           # per-category scores 0-100
    found_profiles: Mapped[dict | None] = mapped_column(JSON)        # discovered social accounts
    flagged_content: Mapped[list | None] = mapped_column(JSON)       # list of flagged items
    ai_summary: Mapped[str | None] = mapped_column(Text)
    raw_data: Mapped[dict | None] = mapped_column(JSON)              # all scraped raw data
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime)
    # Assessment fields (No. 1 BCA request)
    assessment_status: Mapped[str | None] = mapped_column(String(50))   # appropriate | inappropriate
    assessed_by: Mapped[str | None] = mapped_column(String(255))         # HR user email
    assessed_by_name: Mapped[str | None] = mapped_column(String(255))    # HR user name
    assessed_at: Mapped[DateTime | None] = mapped_column(DateTime)       # timestamp

    # Relationship
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="reports")


class HRUser(Base):
    __tablename__ = "hr_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(50), default="hr")  # hr | admin
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

class AssessmentStatus(str, enum.Enum):
    appropriate = "appropriate"
    inappropriate = "inappropriate"