from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.models.models import Issue, MonitoringReport, MonitoringStatus
from app.schemas.schemas import IssueCreate, IssueResponse, MessageResponse
from app.services.screening_service import start_screening_job
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("/", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    payload: IssueCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(Issue).where(Issue.keyword == payload.keyword))
    if existing:
        raise HTTPException(status_code=409, detail="Issue/keyword ini sudah ada")

    issue = Issue(**payload.model_dump())
    db.add(issue)
    await db.flush()

    report = MonitoringReport(issue_id=issue.id, status=MonitoringStatus.pending)
    db.add(report)
    await db.commit()
    await db.refresh(issue)

    background_tasks.add_task(start_screening_job, issue.id, report.id)
    logger.info("issue_created", issue_id=issue.id, keyword=issue.keyword)
    return issue


@router.get("/", response_model=list[IssueResponse])
async def list_issues(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Issue).order_by(Issue.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: str, db: AsyncSession = Depends(get_db)):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.delete("/{issue_id}", response_model=MessageResponse)
async def delete_issue(issue_id: str, db: AsyncSession = Depends(get_db)):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    await db.execute(
        delete(MonitoringReport).where(MonitoringReport.issue_id == issue_id)
    )
    await db.delete(issue)
    await db.commit()

    logger.info("issue_deleted", issue_id=issue_id)
    return MessageResponse(message="Issue dan semua data terkait berhasil dihapus")
