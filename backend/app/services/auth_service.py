from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import HRUser
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 jam


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[HRUser]:
    result = await db.execute(select(HRUser).where(HRUser.email == email))
    return result.scalars().first()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[HRUser]:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def create_user(db: AsyncSession, email: str, full_name: str, password: str, role: str = "hr") -> HRUser:
    user = HRUser(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user