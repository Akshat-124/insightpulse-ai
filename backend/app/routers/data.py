from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.engine.anomalies import AnomalyDetector
from app.engine.database import DatabaseEngine
from app.engine.data_quality import DataQualityChecker
from app.schemas.models import AnomalyReport, DataQualityReport

router = APIRouter(prefix="/api/data", tags=["Data Intelligence"])

class CustomQueryRequest(BaseModel):
    query: str
    max_rows: Optional[int] = 500

@router.get("/quality/{table_name}", response_model=DataQualityReport)
async def get_data_quality(table_name: str):
    """Profiles dataset completeness, nulls, duplicates, and column distributions."""
    try:
        return DataQualityChecker.profile_table(table_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/anomalies/{table_name}", response_model=AnomalyReport)
async def get_anomalies(
    table_name: str,
    column: Optional[str] = Query(None, description="Numeric column to inspect"),
    method: str = Query("iqr", enum=["iqr", "zscore"]),
    threshold: float = Query(1.5, description="IQR multiplier or Z-Score threshold"),
):
    """Detects statistical outliers in a dataset column."""
    try:
        return AnomalyDetector.detect_anomalies(
            table_name=table_name, column=column, method=method, threshold=threshold
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/query")
async def execute_custom_query(payload: CustomQueryRequest):
    """Executes a safe read-only SQL query in DuckDB."""
    db = DatabaseEngine.get_instance()
    try:
        return db.execute_query(payload.query, max_rows=payload.max_rows or 500)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
