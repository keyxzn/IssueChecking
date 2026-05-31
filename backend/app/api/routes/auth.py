from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.auth_service import authenticate_user, create_access_token, create_user, get_user_by_email
from app.models.models import HRUser

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "hr"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_email: str
    user_name: str
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
        )
    token = create_access_token({"sub": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        user_email=user.email,
        user_name=user.full_name,
        role=user.role,
    )


@router.post("/register", response_model=UserOut)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register HR user baru. Di production, endpoint ini harus diproteksi admin."""
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user = await create_user(db, data.email, data.full_name, data.password, data.role)
    return user


@router.get("/me", response_model=UserOut)
async def get_me(current_user: HRUser = Depends(get_current_user)):
    return current_user