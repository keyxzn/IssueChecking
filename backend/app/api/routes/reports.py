from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import ScreeningReport, Candidate, HRUser
from app.schemas.schemas import ScreeningReportResponse, AssessmentUpdate

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/all/list", response_model=list[ScreeningReportResponse])
async def list_all_reports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScreeningReport).order_by(ScreeningReport.created_at.desc()))
    return result.scalars().all()


@router.get("/{candidate_id}", response_model=ScreeningReportResponse)
async def get_report_by_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Always query by candidate_id — never by report primary key."""
    result = await db.execute(
        select(ScreeningReport)
        .where(ScreeningReport.candidate_id == candidate_id)
        .order_by(ScreeningReport.created_at.desc())
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/{report_id}/assess", response_model=ScreeningReportResponse)
async def assess_report(
    report_id: str,
    data: AssessmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(get_current_user),
):
    """Set Appropriate / Inappropriate assessment by HR."""
    report = await db.get(ScreeningReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.assessment_status = data.assessment_status
    report.assessed_by       = current_user.email
    report.assessed_by_name  = current_user.full_name
    report.assessed_at       = datetime.utcnow()
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{candidate_id}/pdf")
async def download_report_pdf(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Download screening report as PDF."""
    from fastapi.responses import Response
    from app.services.report_service import generate_pdf_report

    result = await db.execute(
        select(ScreeningReport)
        .where(ScreeningReport.candidate_id == candidate_id)
        .order_by(ScreeningReport.created_at.desc())
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    candidate = await db.get(Candidate, candidate_id)
    name_slug = (candidate.full_name if candidate else "candidate").replace(" ", "_")
    pdf_bytes = await generate_pdf_report(report)
    filename = f"HRCheck_Report_{name_slug}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )