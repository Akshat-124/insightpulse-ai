import numpy as np
import pandas as pd
from typing import Optional
from app.engine.database import DatabaseEngine
from app.schemas.models import AnomalyItem, AnomalyReport

class AnomalyDetector:
    @staticmethod
    def detect_anomalies(
        table_name: str,
        column: Optional[str] = None,
        method: str = "iqr",
        threshold: float = 1.5,
        max_results: int = 15,
    ) -> AnomalyReport:
        db = DatabaseEngine.get_instance()
        df = db.get_dataframe(table_name)

        if df.empty:
            raise ValueError(f"Table '{table_name}' has no rows.")

        # If column not provided, automatically choose the numeric column with highest variance
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            raise ValueError(f"No numeric columns found in table '{table_name}' for anomaly detection.")

        if not column or column not in df.columns:
            # Pick highest variance numeric column
            variances = {col: df[col].var() for col in numeric_cols if not df[col].isnull().all()}
            if not variances:
                raise ValueError("No valid numeric variance found.")
            column = max(variances, key=variances.get)

        series = pd.to_numeric(df[column], errors="coerce").dropna()
        if len(series) < 5:
            raise ValueError(f"Not enough data points in '{column}' to compute anomalies.")

        anomalies: list[AnomalyItem] = []
        dist_summary = {}

        # Look for candidate identifier columns (order_id, id, customer_id, etc.)
        id_col = None
        for col in df.columns:
            if any(key in col.lower() for key in ["id", "code", "name", "key"]):
                id_col = col
                break

        if method.lower() == "zscore":
            mean = series.mean()
            std = series.std()
            z_thresh = threshold if threshold > 1.5 else 3.0
            dist_summary = {
                "mean": round(float(mean), 2),
                "std": round(float(std), 2),
                "z_threshold": z_thresh,
            }

            if std > 0:
                z_scores = (series - mean).abs() / std
                outlier_indices = z_scores[z_scores > z_thresh].sort_values(ascending=False).index

                for idx in outlier_indices[:max_results]:
                    val = float(series.loc[idx])
                    score = float(z_scores.loc[idx])
                    row_id = str(df.loc[idx, id_col]) if id_col else f"Row {idx + 1}"
                    direction = "above" if val > mean else "below"
                    diff = abs(val - mean)
                    reason = (
                        f"Value {val:,.2f} is {score:.2f} standard deviations {direction} the mean ({mean:,.2f}), "
                        f"deviating by {diff:,.2f} (Z-Score threshold = {z_thresh})."
                    )
                    anomalies.append(
                        AnomalyItem(
                            identifier=row_id,
                            column=column,
                            value=val,
                            score=round(score, 2),
                            reason=reason,
                        )
                    )

        else:  # IQR Method (Default & robust to non-normal distributions)
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            multiplier = threshold  # standard 1.5
            lower_bound = q1 - multiplier * iqr
            upper_bound = q3 + multiplier * iqr

            dist_summary = {
                "q1_25th": round(float(q1), 2),
                "median_50th": round(float(series.median()), 2),
                "q3_75th": round(float(q3), 2),
                "iqr": round(float(iqr), 2),
                "lower_bound": round(float(lower_bound), 2),
                "upper_bound": round(float(upper_bound), 2),
            }

            outliers = series[(series < lower_bound) | (series > upper_bound)]
            # Sort by distance from bounds
            dist_from_bound = outliers.apply(
                lambda v: (v - upper_bound) if v > upper_bound else (lower_bound - v)
            ).sort_values(ascending=False)

            for idx in dist_from_bound.index[:max_results]:
                val = float(series.loc[idx])
                row_id = str(df.loc[idx, id_col]) if id_col else f"Row {idx + 1}"
                if val > upper_bound:
                    dist = val - upper_bound
                    reason = (
                        f"Value {val:,.2f} is significantly higher than the upper threshold ({upper_bound:,.2f}) "
                        f"by {dist:,.2f} (Q3={q3:,.2f} + {multiplier}×IQR)."
                    )
                else:
                    dist = lower_bound - val
                    reason = (
                        f"Value {val:,.2f} is significantly lower than the lower threshold ({lower_bound:,.2f}) "
                        f"by {dist:,.2f} (Q1={q1:,.2f} - {multiplier}×IQR)."
                    )

                score = round(float(dist / iqr if iqr != 0 else 0), 2)
                anomalies.append(
                    AnomalyItem(
                        identifier=row_id,
                        column=column,
                        value=val,
                        score=score,
                        reason=reason,
                    )
                )

        return AnomalyReport(
            table_name=table_name,
            column=column,
            method=method.upper(),
            threshold=threshold,
            total_anomalies=len(anomalies),
            anomalies=anomalies,
            distribution_summary=dist_summary,
        )
