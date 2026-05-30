# 🛡️ IssueChecker

Aplikasi web screening issue dari berbagai media.
**Total biaya tools: Rp 0** — semua open source & gratis.

---

## Stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Python + FastAPI + SQLAlchemy |
| Database | PostgreSQL |
| AI Analisis | Ollama + Llama 3 (lokal, gratis) |
| OSINT | googlesearch-python + Playwright |

---

## Cara Jalankan (Step by Step)

### 1. Install prasyarat

- [Node.js 18+](https://nodejs.org)
- [Python 3.11+](https://python.org)
- [PostgreSQL 15+](https://postgresql.org)
- [Ollama](https://ollama.com) — untuk AI analisis

### 2. Setup Database PostgreSQL

```bash
# Masuk ke psql
psql -U postgres

# Buat database
CREATE DATABASE issue_checker;
\q
```

### 3. Setup Backend

```bash
cd backend

# Buat virtual environment
python -m venv venv
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate        # Windows

# Install dependensi
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium

# Setup environment
cp .env.example .env
# Edit .env sesuai konfigurasi kamu

# Jalankan backend
uvicorn app.main:app --reload --port 8000
```

Backend akan jalan di: http://localhost:8000 
Dokumentasi API: http://localhost:8000/docs

### 4. Setup Ollama (AI Lokal)

```bash
# Install Ollama dari https://ollama.com
# Lalu jalankan:
ollama serve

# Di terminal lain, download model Llama3:
ollama pull llama3
```

### 5. Setup Frontend

```bash
cd frontend

# Install dependensi
npm install

# Buat file environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Jalankan frontend
npm run dev