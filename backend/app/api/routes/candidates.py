from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.models.models import Candidate, ScreeningReport, ScreeningStatus
from app.schemas.schemas import CandidateCreate, CandidateResponse, MessageResponse
from app.services.screening_service import start_screening_job
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.post("/", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    payload: CandidateCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    candidate = Candidate(**payload.model_dump())
    db.add(candidate)
    await db.flush()

    report = ScreeningReport(candidate_id=candidate.id, status=ScreeningStatus.pending)
    db.add(report)
    await db.commit()
    await db.refresh(candidate)

    background_tasks.add_task(start_screening_job, candidate.id, report.id)
    logger.info("candidate_created", candidate_id=candidate.id, name=candidate.full_name)
    return candidate


@router.get("/", response_model=list[CandidateResponse])
async def list_candidates(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Candidate).order_by(Candidate.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Issue not found")
    return candidate


@router.delete("/{candidate_id}", response_model=MessageResponse)
async def delete_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    """Delete kandidat + semua report (sesuai UU PDP)."""
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Hapus semua report pakai DELETE langsung — hindari cascade issue
    await db.execute(
        delete(ScreeningReport).where(ScreeningReport.candidate_id == candidate_id)
    )
    await db.delete(candidate)
    await db.commit()

    logger.info("candidate_deleted", candidate_id=candidate_id)
    return MessageResponse(message="Issue and all monitoring data deleted successfully")