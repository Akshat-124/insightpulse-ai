from typing import Any, Optional, Union
from pydantic import BaseModel, Field

class ColumnInfo(BaseModel):
    name: str
    data_type: str
    nullable: bool = True

class TableInfo(BaseModel):
    table_name: str
    row_count: int
    column_count: int
    columns: list[ColumnInfo]
    sample_rows: list[dict[str, Any]] = []

class ColumnProfile(BaseModel):
    name: str
    dtype: str
    null_count: int
    null_percentage: float
    unique_count: int
    sample_values: list[Any] = []
    min_val: Optional[Any] = None
    max_val: Optional[Any] = None
    mean_val: Optional[float] = None

class DataQualityReport(BaseModel):
    table_name: str
    total_rows: int
    total_columns: int
    duplicate_rows: int
    completeness_score: float  # Percentage of non-null cells across the table
    column_profiles: list[ColumnProfile]

class AnomalyItem(BaseModel):
    identifier: Union[str, int]
    column: str
    value: Any
    score: float
    reason: str

class AnomalyReport(BaseModel):
    table_name: str
    column: str
    method: str  # 'zscore' or 'iqr'
    threshold: float
    total_anomalies: int
    anomalies: list[AnomalyItem]
    distribution_summary: dict[str, Any] = {}

class ChartSpec(BaseModel):
    chart_type: str  # 'bar', 'line', 'pie', 'scatter', 'area'
    title: str
    x_key: str
    y_keys: list[str]
    data: list[dict[str, Any]]
    x_label: Optional[str] = None
    y_label: Optional[str] = None

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    active_tables: Optional[list[str]] = None

class ChatResponse(BaseModel):
    session_id: str
    answer: str
    reasoning: Optional[str] = None
    sql_query: Optional[str] = None
    pandas_code: Optional[str] = None
    chart: Optional[ChartSpec] = None
    anomalies: Optional[AnomalyReport] = None
    data_preview: Optional[list[dict[str, Any]]] = None
    columns: Optional[list[str]] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None
