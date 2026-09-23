import os
import shutil

from fastapi import APIRouter, File, HTTPException, UploadFile
from app.config import SAMPLES_DIR, UPLOADS_DIR
from app.engine.database import DatabaseEngine
from app.engine.validator import FileValidator
from app.schemas.models import TableInfo

router = APIRouter(prefix="/api", tags=["Datasets"])

@router.post("/upload", response_model=list[TableInfo])
async def upload_csv_files(files: list[UploadFile] = File(...)):
    """Upload and register one or more CSV files into DuckDB."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    db = DatabaseEngine.get_instance()
    registered_tables = []

    for file in files:
        contents = await file.read()
        is_valid, err_msg, delimiter = FileValidator.validate_csv(contents, file.filename or "data.csv")
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"File '{file.filename}': {err_msg}")

        # Save to disk
        safe_filename = file.filename or "data.csv"
        saved_path = UPLOADS_DIR / safe_filename
        with open(saved_path, "wb") as f:
            f.write(contents)

        # Register in DuckDB
        table_info = db.register_csv(str(saved_path))
        registered_tables.append(table_info)

    return registered_tables

@router.post("/samples/load", response_model=list[TableInfo])
async def load_sample_datasets():
    """Loads pre-configured sample datasets (Ecommerce Sales & SaaS Subscriptions)."""
    db = DatabaseEngine.get_instance()
    loaded = []

    for sample_file in SAMPLES_DIR.glob("*.csv"):
        t_info = db.register_csv(str(sample_file))
        loaded.append(t_info)

    if not loaded:
        raise HTTPException(status_code=404, detail="No sample datasets found.")

    return loaded

@router.get("/tables", response_model=list[TableInfo])
async def list_tables():
    """Lists all active analytical tables registered in DuckDB."""
    db = DatabaseEngine.get_instance()
    return db.list_tables()
