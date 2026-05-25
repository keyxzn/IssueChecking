from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "HR Screening API"
    app_env: str = "development"

    secret_key: str = "changeme-secret-key-for-dev"

    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://192.168.220.1:3000",
        "http://192.168.220.1:3001",
    ]

    # Database
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/hr_checker"
    )

    # Ollama
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # Google Custom Search API (https://developers.google.com/custom-search)
    # Free: 100 queries/hari, 3000/bulan
    google_api_key: str = ""
    google_cx: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()