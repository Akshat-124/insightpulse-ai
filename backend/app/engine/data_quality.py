import numpy as np
import pandas as pd
from app.engine.database import DatabaseEngine
from app.schemas.models import ColumnProfile, DataQualityReport

class DataQualityChecker:
    @staticmethod
    def profile_table(table_name: str) -> DataQualityReport:
        db = DatabaseEngine.get_instance()
        df = db.get_dataframe(table_name)

        total_rows = len(df)
        total_cols = len(df.columns)
        if total_rows == 0:
            return DataQualityReport(
                table_name=table_name,
                total_rows=0,
                total_columns=total_cols,
                duplicate_rows=0,
                completeness_score=0.0,
                column_profiles=[],
            )

        # Duplicate check
        duplicate_rows = int(df.duplicated().sum())

        # Total cells vs null cells
        total_cells = total_rows * total_cols
        null_cells = int(df.isnull().sum().sum())
        completeness_score = round(((total_cells - null_cells) / total_cells) * 100, 2)

        column_profiles: list[ColumnProfile] = []

        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            null_pct = round((null_count / total_rows) * 100, 2)
            unique_count = int(series.nunique(dropna=True))

            # Non-null sample values
            clean_series = series.dropna()
            samples = clean_series.head(4).tolist()
            # Convert non-serializable objects (like timestamps)
            samples = [str(s) if isinstance(s, (pd.Timestamp, np.datetime64)) else s for s in samples]

            min_val = None
            max_val = None
            mean_val = None

            if pd.api.types.is_numeric_dtype(series) and not clean_series.empty:
                min_val = round(float(clean_series.min()), 2)
                max_val = round(float(clean_series.max()), 2)
                mean_val = round(float(clean_series.mean()), 2)
            elif pd.api.types.is_datetime64_any_dtype(series) and not clean_series.empty:
                min_val = str(clean_series.min())
                max_val = str(clean_series.max())

            column_profiles.append(
                ColumnProfile(
                    name=col,
                    dtype=str(series.dtype),
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                    sample_values=samples,
                    min_val=min_val,
                    max_val=max_val,
                    mean_val=mean_val,
                )
            )

        return DataQualityReport(
            table_name=table_name,
            total_rows=total_rows,
            total_columns=total_cols,
            duplicate_rows=duplicate_rows,
            completeness_score=completeness_score,
            column_profiles=column_profiles,
        )
