# -*- coding: utf-8 -*-
import asyncio
from app.mcp_server import mcp

def test_mcp_tool_registration():
    async def _test():
        tools = await mcp.list_tools()
        names = [t.name for t in tools]
        assert "execute_sql" in names
        assert "detect_anomalies" in names
        assert "list_tables" in names
        assert "get_table_schema" in names
        assert "profile_data_quality" in names
    asyncio.run(_test())

def test_mcp_execute_sql():
    async def _test():
        res = await mcp.call_tool("execute_sql", {"query": "SELECT 1 + 1 as val"})
        assert not res.is_error
        assert "val" in res.content[0].text
    asyncio.run(_test())

def test_mcp_detect_anomalies():
    async def _test():
        res = await mcp.call_tool("detect_anomalies", {
            "table_name": "ecommerce_sales",
            "column": "revenue",
            "method": "iqr"
        })
        assert not res.is_error
        assert "total_anomalies" in res.content[0].text
    asyncio.run(_test())
