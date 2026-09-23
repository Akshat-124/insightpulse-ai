from fastapi.testclient import TestClient
from app.main import app

def test_api_suite():
    with TestClient(app) as client:
        # 1. Health
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "online"
        assert data["tables_loaded"] >= 2

        # 2. List tables
        res = client.get("/api/tables")
        assert res.status_code == 200
        tables = res.json()
        assert len(tables) >= 2
        table_names = [t["table_name"] for t in tables]
        assert "ecommerce_sales" in table_names

        # 3. Chat query - highest revenue
        res = client.post("/api/chat", json={"query": "Which region generated the highest revenue?"})
        assert res.status_code == 200
        cdata = res.json()
        assert "revenue" in cdata["answer"].lower()
        assert cdata["sql_query"] is not None
        assert cdata["chart"] is not None
        assert cdata["chart"]["chart_type"] == "bar"

        # 4. Chat query - anomalies
        res = client.post("/api/chat", json={"query": "Detect anomalies in the dataset"})
        assert res.status_code == 200
        adata = res.json()
        assert adata["anomalies"] is not None
        assert adata["anomalies"]["total_anomalies"] > 0

        # 5. Data Quality Profile
        res = client.get("/api/data/quality/ecommerce_sales")
        assert res.status_code == 200
        qdata = res.json()
        assert qdata["total_rows"] == 500
        assert qdata["completeness_score"] > 90
