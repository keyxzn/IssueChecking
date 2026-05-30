"""
Script untuk buat akun ADMIN pertama.
Jalankan sekali dari folder backend:
  python create_admin.py
"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.services.auth_service import create_user, get_user_by_email

async def main():
    print("=== IssueCheck — Buat Akun Admin ===")
    email    = input("Email admin: ").strip()
    name     = input("Nama lengkap: ").strip()
    password = input("Password: ").strip()

    async with AsyncSessionLocal() as db:
        existing = await get_user_by_email(db, email)
        if existing:
            print(f"❌ Email {email} sudah terdaftar sebagai role: {existing.role}")
            return

        user = await create_user(db, email, name, password, role="admin")
        print(f"\n✅ Akun admin berhasil dibuat!")
        print(f"   Email : {user.email}")
        print(f"   Nama  : {user.full_name}")
        print(f"   Role  : {user.role}")
        print(f"\nLogin di http://localhost:3000 dengan email dan password di atas.")

asyncio.run(main())