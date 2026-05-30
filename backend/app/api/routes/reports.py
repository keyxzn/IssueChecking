from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import MonitoringReport, Issue, AppUser
from app.schemas.schemas import MonitoringReportResponse, AssessmentUpdate

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/all/list", response_model=list[MonitoringReportResponse])
async def list_all_reports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MonitoringReport).order_by(MonitoringReport.created_at.desc()))
    return result.scalars().all()


@router.get("/{issue_id}", response_model=MonitoringReportResponse)
async def get_report_by_issue(issue_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MonitoringReport)
        .where(MonitoringReport.issue_id == issue_id)
        .order_by(MonitoringReport.created_at.desc())
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}/assess", response_model=MonitoringReportResponse)
async def assess_report(
    report_id: str,
    data: AssessmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    """Set Relevant / Irrelevant assessment by analyst."""
    report = await db.get(MonitoringReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.assessment_status = data.assessment_status
    report.assessed_by       = current_user.email
    report.assessed_by_name  = current_user.full_name
    report.assessed_at       = datetime.utcnow()
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{issue_id}/pdf")
async def download_report_pdf(issue_id: str, db: AsyncSession = Depends(get_db)):
    """Download monitoring report as PDF."""
    from fastapi.responses import Response
    from app.services.report_service import generate_pdf_report

    result = await db.execute(
        select(MonitoringReport)
        .where(MonitoringReport.issue_id == issue_id)
        .order_by(MonitoringReport.created_at.desc())
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    issue = await db.get(Issue, issue_id)
    kw_slug = (issue.keyword if issue else "issue").replace(" ", "_")
    pdf_bytes = await generate_pdf_report(report)
    filename = f"StrappingMedia_Report_{kw_slug}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
