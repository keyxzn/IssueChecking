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


class MonitoringStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    keyword: Mapped[str] = mapped_column(String(255), nullable=False)
    instagram_url: Mapped[str | None] = mapped_column(Text)
    twitter_url: Mapped[str | None] = mapped_column(Text)
    facebook_url: Mapped[str | None] = mapped_column(Text)
    tiktok_url: Mapped[str | None] = mapped_column(Text)
    youtube_url: Mapped[str | None] = mapped_column(Text)
    consent_given: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship
    reports: Mapped[list["MonitoringReport"]] = relationship("MonitoringReport", back_populates="issue")


class MonitoringReport(Base):
    __tablename__ = "monitoring_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id: Mapped[str] = mapped_column(String(36), ForeignKey("issues.id"), nullable=False)
    status: Mapped[MonitoringStatus] = mapped_column(SAEnum(MonitoringStatus), default=MonitoringStatus.pending)
    overall_risk: Mapped[RiskLevel | None] = mapped_column(SAEnum(RiskLevel))
    risk_scores: Mapped[dict | None] = mapped_column(JSON)           # per-category scores 0-100
    found_profiles: Mapped[dict | None] = mapped_column(JSON)        # discovered social accounts
    flagged_content: Mapped[list | None] = mapped_column(JSON)       # list of flagged items
    ai_summary: Mapped[str | None] = mapped_column(Text)
    raw_data: Mapped[dict | None] = mapped_column(JSON)              # all scraped raw data
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime)
    # Assessment fields
    assessment_status: Mapped[str | None] = mapped_column(String(50))   # relevant | irrelevant
    assessed_by: Mapped[str | None] = mapped_column(String(255))
    assessed_by_name: Mapped[str | None] = mapped_column(String(255))
    assessed_at: Mapped[DateTime | None] = mapped_column(DateTime)

    # Relationship
    issue: Mapped["Issue"] = relationship("Issue", back_populates="reports")


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(50), default="analyst")  # analyst | admin
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class AssessmentStatus(str, enum.Enum):
    relevant = "relevant"
    irrelevant = "irrelevant"
