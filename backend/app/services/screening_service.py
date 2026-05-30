"""
Monitoring Service — orchestrates the full media scan pipeline
"""
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.models import MonitoringReport, Issue, MonitoringStatus, RiskLevel
from app.services.scrapers import (
    scrape_google,
    scrape_twitter,
    scrape_news,
    scrape_instagram,
    scrape_facebook,
)
from app.services.ai_analyzer import analyze_with_claude
import structlog

logger = structlog.get_logger()


async def start_screening_job(issue_id: str, report_id: str):
    async with AsyncSessionLocal() as db:
        try:
            await _run_monitoring(db, issue_id, report_id)
        except Exception as e:
            logger.error("monitoring_failed", report_id=report_id, error=str(e))
            report = await db.get(MonitoringReport, report_id)
            if report:
                report.status = MonitoringStatus.failed
                report.error_message = str(e)
                await db.commit()


async def _run_monitoring(db: AsyncSession, issue_id: str, report_id: str):
    issue  = await db.get(Issue, issue_id)
    report = await db.get(MonitoringReport, report_id)

    if not issue or not report:
        raise ValueError("Issue or report not found")

    report.status = MonitoringStatus.processing
    await db.commit()

    logger.info("monitoring_started", keyword=issue.keyword)

    # ── Step 1: Scrape semua platform paralel ─────────────
    scrape_tasks = [
        scrape_google(issue.keyword, None),
        scrape_twitter(issue.twitter_url),
        scrape_news(issue.keyword),
        scrape_instagram(issue.instagram_url),
        scrape_facebook(issue.facebook_url),
    ]
    results = await asyncio.gather(*scrape_tasks, return_exceptions=True)

    google_data    = results[0] if not isinstance(results[0], Exception) else {}
    twitter_data   = results[1] if not isinstance(results[1], Exception) else {}
    news_data      = results[2] if not isinstance(results[2], Exception) else {}
    instagram_data = results[3] if not isinstance(results[3], Exception) else {}
    facebook_data  = results[4] if not isinstance(results[4], Exception) else {}

    raw_data = {
        "google":    google_data,
        "twitter":   twitter_data,
        "news":      news_data,
        "instagram": instagram_data,
        "facebook":  facebook_data,
    }

    # ── Step 2: AI analysis ──────────────────────────────
    await asyncio.sleep(5)
    analysis = await analyze_with_claude(issue.keyword, raw_data)

    # ── Step 3: Save ──────────────────────────────────────
    report.status          = MonitoringStatus.completed
    report.overall_risk    = _compute_overall_risk(analysis["risk_scores"])
    report.risk_scores     = analysis["risk_scores"]
    report.found_profiles  = _extract_profiles(raw_data, issue)
    report.flagged_content = analysis["flagged_content"]
    report.ai_summary      = analysis["summary"]
    report.raw_data        = raw_data
    report.completed_at    = datetime.utcnow()

    await db.commit()
    logger.info("monitoring_completed", report_id=report_id, risk=report.overall_risk)


def _compute_overall_risk(scores: dict) -> RiskLevel:
    if not scores:
        return RiskLevel.low
    max_score = max(scores.values(), default=0)
    if max_score >= 75:  return RiskLevel.critical
    if max_score >= 50:  return RiskLevel.high
    if max_score >= 25:  return RiskLevel.medium
    return RiskLevel.low


def _extract_profiles(raw_data: dict, issue=None) -> dict:
    profiles = {}

    if ig := raw_data.get("instagram", {}):
        if ig.get("profile_url") and ig.get("username"):
            profiles["instagram"] = ig["profile_url"]
    elif issue and issue.instagram_url:
        u = issue.instagram_url.strip()
        handle = u.replace("@","").split("/")[-1]
        profiles["instagram"] = f"https://www.instagram.com/{handle}/"

    if fb := raw_data.get("facebook", {}):
        if fb.get("profile_url") and fb.get("username"):
            profiles["facebook"] = fb["profile_url"]
    elif issue and getattr(issue, "facebook_url", None):
        u = issue.facebook_url.strip()
        profiles["facebook"] = u if u.startswith("http") else f"https://www.facebook.com/{u.replace('@','').split('/')[-1]}"

    if tw := raw_data.get("twitter", {}):
        if tw.get("username"):
            profiles["twitter"] = f"https://x.com/{tw['username']}"
    elif issue and getattr(issue, "twitter_url", None):
        u = issue.twitter_url.strip()
        handle = u.replace("@","").split("/")[-1]
        profiles["twitter"] = f"https://x.com/{handle}"

    if issue and getattr(issue, "tiktok_url", None):
        profiles["tiktok"] = issue.tiktok_url

    if issue and getattr(issue, "youtube_url", None):
        profiles["youtube"] = issue.youtube_url

    return profiles
