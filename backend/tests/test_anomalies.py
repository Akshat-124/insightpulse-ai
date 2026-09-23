import pytest
from app.config import SAMPLES_DIR
from app.engine.database import DatabaseEngine
from app.engine.anomalies import AnomalyDetector

@pytest.fixture(scope="module", autouse=True)
def setup_table():
    db = DatabaseEngine.get_instance()
    sample_file = SAMPLES_DIR / "ecommerce_sales.csv"
    db.register_csv(str(sample_file), "anomaly_test_table")

def test_detect_anomalies_iqr():
    report = AnomalyDetector.detect_anomalies("anomaly_test_table", column="revenue", method="iqr")
    assert report.total_anomalies > 0
    assert report.method == "IQR"
    assert len(report.anomalies) > 0
    # Ensure reason string is well formatted
    first = report.anomalies[0]
    assert "Value" in first.reason
    assert "threshold" in first.reason

def test_detect_anomalies_zscore():
    report = AnomalyDetector.detect_anomalies("anomaly_test_table", column="quantity", method="zscore", threshold=3.0)
    assert report.method == "ZSCORE"
    assert "mean" in report.distribution_summary
    assert "std" in report.distribution_summary
