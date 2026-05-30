import asyncio
import uuid
from app.core.database import AsyncSessionLocal
from app.models.models import Issue, MonitoringReport, MonitoringStatus, RiskLevel

async def seed():
    async with AsyncSessionLocal() as db:
        issue = Issue(
            id=str(uuid.uuid4()),
            keyword="Polusi Jakarta (Test)",
            twitter_url="https://x.com/dummy",
            consent_given=True
        )
        db.add(issue)
        await db.flush()

        r = MonitoringReport(
            issue_id=issue.id,
            status=MonitoringStatus.completed,
            overall_risk=RiskLevel.high,
            risk_scores={
                "explicit_content": 10,
                "toxic_language": 78,
                "hate_speech": 65,
                "violence": 20,
                "extremism": 5,
                "misinformation": 40
            },
            found_profiles={"twitter": "https://x.com/dummy"},
            flagged_content=[{
                "platform": "Twitter",
                "content_snippet": "Contoh tweet berisi informasi menyesatkan tentang isu polusi",
                "category": "misinformation",
                "severity": "high"
            }],
            ai_summary="Keyword 'Polusi Jakarta' terdeteksi banyak beredar dengan konten toxic language dan hate speech di Twitter. Ditemukan 15 postingan mengandung bahasa kasar dan 8 postingan dengan ujaran kebencian terkait isu ini. Perlu pemantauan lebih lanjut."
        )
        db.add(r)
        await db.commit()
        print("Done! Issue ID:", issue.id)

asyncio.run(seed())