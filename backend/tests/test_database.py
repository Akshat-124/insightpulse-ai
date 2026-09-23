import pytest
from app.config import SAMPLES_DIR
from app.engine.database import DatabaseEngine

def test_register_and_list_tables():
    db = DatabaseEngine.get_instance()
    sample_file = SAMPLES_DIR / "ecommerce_sales.csv"
    assert sample_file.exists(), "Sample file should exist"

    table_info = db.register_csv(str(sample_file), "test_ecommerce")
    assert table_info.table_name == "test_ecommerce"
    assert table_info.row_count > 0
    assert len(table_info.columns) > 0

    tables = db.list_tables()
    names = [t.table_name for t in tables]
    assert "test_ecommerce" in names

def test_execute_query():
    db = DatabaseEngine.get_instance()
    res = db.execute_query("SELECT COUNT(*) AS total_count FROM test_ecommerce")
    assert res["row_count"] == 1
    assert res["data"][0]["total_count"] > 0
    assert "execution_time_ms" in res

def test_prevent_dangerous_sql():
    db = DatabaseEngine.get_instance()
    with pytest.raises(ValueError, match="Only read-only analytical queries"):
        db.execute_query("DROP TABLE test_ecommerce")

    with pytest.raises(ValueError, match="Only read-only analytical queries"):
        db.execute_query("DELETE FROM test_ecommerce WHERE 1=1")
