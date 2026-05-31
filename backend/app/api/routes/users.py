"""User Management — No. 7 BCA Request"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import HRUser
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def require_admin(current_user: HRUser = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(require_admin),
):
    result = await db.execute(select(HRUser).order_by(HRUser.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(require_admin),
):
    existing = await db.execute(select(HRUser).where(HRUser.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    user = HRUser(
        email=data.email,
        full_name=data.full_name,
        hashed_password=pwd_context.hash(data.password),
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(require_admin),
):
    user = await db.get(HRUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.full_name is not None: user.full_name = data.full_name
    if data.email is not None:     user.email = data.email
    if data.role is not None:      user.role = data.role
    if data.is_active is not None: user.is_active = data.is_active
    if data.password:              user.hashed_password = pwd_context.hash(data.password)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: HRUser = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Tidak bisa hapus akun sendiri")
    user = await db.get(HRUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}