from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings, SAMPLES_DIR
from app.engine.database import DatabaseEngine
from app.routers import chat, data, export, upload

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Preload sample datasets so reviewers have an immediate ready-to-test workspace
    try:
        db = DatabaseEngine.get_instance()
        sample_files = list(SAMPLES_DIR.glob("*.csv"))
        for s_file in sample_files:
            db.register_csv(str(s_file))
            logger.info(f"Auto-registered sample table from {s_file.name}")
    except Exception as e:
        logger.warning(f"Could not auto-register sample datasets: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous AI Data Analyst Copilot powered by DuckDB, Groq Llama-3.3-70B, and interactive data visualizations.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(data.router)
app.include_router(export.router)

@app.get("/health", tags=["System"])
async def health_check():
    db = DatabaseEngine.get_instance()
    tables = db.list_tables()
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "groq_configured": bool(settings.GROQ_API_KEY.strip()),
        "groq_model": settings.GROQ_MODEL,
        "tables_loaded": len(tables),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
