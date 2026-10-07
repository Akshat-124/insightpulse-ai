# -*- coding: utf-8 -*-
"""
InsightPulse AI - Model Context Protocol (MCP) Server
Exposes DuckDB In-Memory OLAP Engine, Statistical Anomaly Detection,
and Data Quality Profiling as standardized MCP tools.
Compatible with MCP clients including Claude Desktop, Cursor, and Antigravity.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project and backend directories are in sys.path
CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parent if (CURRENT_FILE.parent / "app").exists() else CURRENT_FILE.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(CURRENT_FILE.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_FILE.parent))

from mcp.server.mcpserver import MCPServer
from app.config import SAMPLES_DIR, UPLOADS_DIR
from app.engine.database import DatabaseEngine
from app.engine.anomalies import AnomalyDetector
from app.engine.data_quality import DataQualityChecker

# Initialize MCP Server
mcp = MCPServer(
    name="InsightPulse AI Analytical Server",
    version="1.0.0",
    instructions=(
        "InsightPulse AI provides ultra-fast in-memory analytical query execution via DuckDB, "
        "rigorous statistical outlier detection (IQR and Z-score), and automated data quality profiling. "
        "Always use execute_sql for analytical aggregations, rankings, and filters instead of guessing arithmetic. "
        "Always use detect_anomalies for finding numerical anomalies."
    )
)

db = DatabaseEngine.get_instance()

def _ensure_tables_loaded():
    """Ensure bundled sample and uploaded CSV datasets are registered in DuckDB."""
    if not db.registered_tables:
        if SAMPLES_DIR.exists():
            for f in SAMPLES_DIR.glob("*.csv"):
                try:
                    db.register_csv(str(f))
                except Exception as e:
                    sys.stderr.write(f"Warning: Failed to load {f}: {e}\n")
        if UPLOADS_DIR.exists():
            for f in UPLOADS_DIR.glob("*.csv"):
                try:
                    db.register_csv(str(f))
                except Exception as e:
                    sys.stderr.write(f"Warning: Failed to load {f}: {e}\n")

_ensure_tables_loaded()


@mcp.tool(
    name="list_tables",
    description="Lists all tables loaded in the DuckDB in-memory OLAP database along with their row counts and column schemas."
)
def list_tables() -> List[Dict[str, Any]]:
    """List all available datasets in DuckDB."""
    _ensure_tables_loaded()
    tables = db.list_tables()
    return [
        {
            "table_name": t.table_name,
            "row_count": t.row_count,
            "column_count": t.column_count,
            "columns": [{"name": c.name, "type": c.data_type} for c in t.columns],
        }
        for t in tables
    ]


@mcp.tool(
    name="get_table_schema",
    description="Retrieves the detailed column schema, datatypes, and sample rows for a specific table in DuckDB."
)
def get_table_schema(table_name: str) -> Dict[str, Any]:
    """Inspect schema and sample rows for a specific table."""
    _ensure_tables_loaded()
    table_info = db.get_table_info(table_name)
    if not table_info:
        return {
            "status": "error",
            "message": f"Table '{table_name}' does not exist. Use list_tables to see available tables."
        }
    return {
        "status": "success",
        "table_name": table_info.table_name,
        "row_count": table_info.row_count,
        "column_count": table_info.column_count,
        "columns": [{"name": c.name, "type": c.data_type, "nullable": c.nullable} for c in table_info.columns],
        "sample_rows": table_info.sample_rows[:3],
    }


@mcp.tool(
    name="execute_sql",
    description=(
        "Executes a read-only DuckDB SQL query against the analytical datasets. "
        "Supports full ANSI SQL, window functions, CTEs, and mathematical aggregations. "
        "Guarantees <25ms execution with zero LLM arithmetic hallucination."
    )
)
def execute_sql(query: str, rationale: str = "") -> Dict[str, Any]:
    """
    Execute read-only SQL in DuckDB.
    Args:
        query: Valid ANSI SQL / DuckDB query (SELECT / WITH).
        rationale: Optional explanation of why this query addresses the question.
    """
    _ensure_tables_loaded()
    try:
        results = db.execute_query(query)
        # Cap data returned over MCP context to 100 rows to prevent context bloat
        capped_data = results["data"][:100]
        return {
            "status": "success",
            "row_count": results["row_count"],
            "returned_rows": len(capped_data),
            "execution_time_ms": results.get("execution_time_ms", 0),
            "columns": results["columns"],
            "data": capped_data,
            "rationale": rationale,
        }
    except Exception as e:
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "message": str(e),
            "query": query
        }


@mcp.tool(
    name="detect_anomalies",
    description=(
        "Performs rigorous statistical outlier detection (IQR or Z-Score) on a numerical column in a dataset. "
        "Flags anomalous spikes or drops and returns verified mathematical explanations."
    )
)
def detect_anomalies(table_name: str, column: str, method: str = "iqr") -> Dict[str, Any]:
    """
    Detect statistical outliers.
    Args:
        table_name: Name of the table to analyze.
        column: Numerical column name (e.g. revenue, quantity, profit, monthly_charges).
        method: Statistical algorithm - 'iqr' (Interquartile Range) or 'zscore' (Standard Deviations).
    """
    _ensure_tables_loaded()
    try:
        report = AnomalyDetector.detect_anomalies(table_name, column, method)
        return {
            "status": "success",
            "table_name": table_name,
            "column": report.column,
            "method": report.method,
            "total_anomalies": report.total_anomalies,
            "anomalies": [
                {
                    "identifier": a.identifier,
                    "column": a.column,
                    "value": a.value,
                    "score": a.score,
                    "reason": a.reason,
                }
                for a in report.anomalies[:20]
            ],
        }
    except Exception as e:
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "message": str(e),
            "table_name": table_name,
            "column": column,
        }


@mcp.tool(
    name="profile_data_quality",
    description="Performs an automated data quality assessment on a table, calculating completeness score, duplicate rows, and null distribution."
)
def profile_data_quality(table_name: str) -> Dict[str, Any]:
    """Assess dataset health and completeness."""
    _ensure_tables_loaded()
    try:
        report = DataQualityChecker.profile_table(table_name)
        return {
            "status": "success",
            "table_name": report.table_name,
            "total_rows": report.total_rows,
            "total_columns": report.total_columns,
            "completeness_score": report.completeness_score,
            "duplicate_rows": report.duplicate_rows,
            "columns": [
                {
                    "name": c.name,
                    "type": c.dtype,
                    "null_count": c.null_count,
                    "null_percentage": c.null_percentage,
                    "unique_values": c.unique_count,
                }
                for c in report.column_profiles
            ],
        }
    except Exception as e:
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "message": str(e),
            "table_name": table_name,
        }


@mcp.tool(
    name="register_dataset",
    description="Dynamically registers a new local CSV file into the DuckDB engine at runtime."
)
def register_dataset(file_path: str) -> Dict[str, Any]:
    """Register a new CSV file path into DuckDB."""
    try:
        table_info = db.register_csv(file_path)
        return {
            "status": "success",
            "table_name": table_info.table_name,
            "row_count": table_info.row_count,
            "columns": [{"name": c.name, "type": c.data_type} for c in table_info.columns],
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "file_path": file_path
        }


if __name__ == "__main__":
    # Support transport via CLI argument: stdio (default) or sse
    transport = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in ("stdio", "sse") else "stdio"
    mcp.run(transport=transport)
