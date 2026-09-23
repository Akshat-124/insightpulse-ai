import re
import time
from typing import Any, Optional
import duckdb
import pandas as pd
from app.schemas.models import ColumnInfo, TableInfo

class DatabaseEngine:
    _instance: Optional["DatabaseEngine"] = None

    def __init__(self):
        # In-memory DuckDB connection
        self.conn = duckdb.connect(database=":memory:", read_only=False)
        self.registered_tables: dict[str, str] = {}  # table_name -> file_path

    @classmethod
    def get_instance(cls) -> "DatabaseEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def sanitize_table_name(self, name: str) -> str:
        # Keep alphanumeric and underscores
        clean_name = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower().strip())
        if clean_name and clean_name[0].isdigit():
            clean_name = f"t_{clean_name}"
        return clean_name or "uploaded_table"

    def register_csv(self, file_path: str, table_name: Optional[str] = None) -> TableInfo:
        if not table_name:
            import os
            base = os.path.splitext(os.path.basename(file_path))[0]
            table_name = self.sanitize_table_name(base)
        else:
            table_name = self.sanitize_table_name(table_name)

        # Normalize path for DuckDB (forward slashes)
        normalized_path = str(file_path).replace("\\", "/")

        # Create or replace table directly from CSV using auto-detection
        query = f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_csv_auto('{normalized_path}', header=True);"
        self.conn.execute(query)
        self.registered_tables[table_name] = normalized_path

        return self.get_table_info(table_name)

    def get_table_info(self, table_name: str) -> TableInfo:
        # Get row count
        count_res = self.conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        row_count = count_res[0] if count_res else 0

        # Get schema info
        schema_df = self.conn.execute(f"DESCRIBE {table_name}").df()
        columns: list[ColumnInfo] = []
        for _, row in schema_df.iterrows():
            columns.append(
                ColumnInfo(
                    name=str(row["column_name"]),
                    data_type=str(row["column_type"]),
                    nullable=str(row.get("null", "YES")).upper() == "YES",
                )
            )

        # Fetch sample rows
        sample_df = self.conn.execute(f"SELECT * FROM {table_name} LIMIT 5").df()
        # Convert NaN / NaT to None for valid JSON serialization
        sample_df = sample_df.where(pd.notnull(sample_df), None)
        sample_rows = sample_df.to_dict(orient="records")

        return TableInfo(
            table_name=table_name,
            row_count=row_count,
            column_count=len(columns),
            columns=columns,
            sample_rows=sample_rows,
        )

    def list_tables(self) -> list[TableInfo]:
        tables_res = self.conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
        ).fetchall()
        table_names = [t[0] for t in tables_res]
        return [self.get_table_info(name) for name in table_names]

    def execute_query(self, sql_query: str, max_rows: int = 1000) -> dict[str, Any]:
        """Safely executes an analytical SQL query and returns records with execution metrics."""
        cleaned_sql = sql_query.strip().rstrip(";")

        # Security check: prevent modification statements
        forbidden_pattern = r"\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|ALTER|GRANT|REVOKE|COPY|PRAGMA|ATTACH|DETACH|INSTALL|LOAD)\b"
        if re.search(forbidden_pattern, cleaned_sql, re.IGNORECASE):
            raise ValueError("Only read-only analytical queries (SELECT / WITH) are allowed.")

        start_time = time.perf_counter()
        # Limit rows to prevent browser freeze on gigantic result sets
        wrapped_query = f"SELECT * FROM ({cleaned_sql}) AS subquery_wrapper LIMIT {max_rows}"
        cursor = self.conn.cursor()
        df = cursor.execute(wrapped_query).df()
        execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Sanitize DataFrame for JSON
        df = df.where(pd.notnull(df), None)
        # Convert timestamp/datetime objects to ISO string
        for col in df.select_dtypes(include=["datetime", "datetimetz"]).columns:
            df[col] = df[col].astype(str)

        records = df.to_dict(orient="records")
        columns = list(df.columns)

        return {
            "columns": columns,
            "data": records,
            "row_count": len(records),
            "execution_time_ms": execution_time_ms,
            "query": cleaned_sql,
        }

    def get_dataframe(self, table_name: str) -> pd.DataFrame:
        """Returns the full table as a Pandas DataFrame for statistical profiling."""
        return self.conn.execute(f"SELECT * FROM {table_name}").df()
