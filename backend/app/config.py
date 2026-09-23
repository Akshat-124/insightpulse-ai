import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "data" / "samples"
UPLOADS_DIR = BASE_DIR / "data" / "uploads"

class Settings(BaseSettings):
    PROJECT_NAME: str = "InsightPulse AI - Data Analyst Copilot"
    VERSION: str = "1.0.0"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # High reasoning, tool calling
    FALLBACK_MODEL: str = "llama-3.1-8b-instant"
    CORS_ORIGINS: list[str] = ["*"]
    MAX_CSV_SIZE_MB: int = 50
    ALLOW_MOCK_FALLBACK: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
