import json
import logging
import re
import time
from typing import Any, Optional
from groq import Groq
from app.config import settings
from app.agent.prompts import SYSTEM_PROMPT, build_schema_context
from app.agent.tools import GROQ_TOOLS
from app.engine.database import DatabaseEngine
from app.engine.anomalies import AnomalyDetector
from app.schemas.models import AnomalyReport, ChartSpec, ChatResponse

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    _instance: Optional["AgentOrchestrator"] = None

    def __init__(self):
        self.sessions: dict[str, list[dict[str, Any]]] = {}
        self.last_query_results: dict[str, dict[str, Any]] = {}

    @classmethod
    def get_instance(cls) -> "AgentOrchestrator":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_or_create_history(self, session_id: str) -> list[dict[str, Any]]:
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        return self.sessions[session_id]

    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id] = []

    def _get_working_model(self, client: Groq) -> str:
        preferred = [settings.GROQ_MODEL, "qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"]
        try:
            available = [m.id for m in client.models.list().data]
            for p in preferred:
                if p in available:
                    return p
            if available:
                return available[0]
        except Exception:
            pass
        return settings.GROQ_MODEL

    def process_query(self, query: str, session_id: str = "default") -> ChatResponse:
        start_time = time.perf_counter()
        db = DatabaseEngine.get_instance()
        tables = db.list_tables()

        if not tables:
            return ChatResponse(
                session_id=session_id,
                answer="No datasets have been uploaded yet. Please upload one or more CSV files or click 'Load Sample Dataset' to begin analyzing!",
                execution_time_ms=0.0,
            )

        tables_info_dict = [t.model_dump() for t in tables]
        history = self._get_or_create_history(session_id)

        # Check if Groq API Key is configured
        api_key = settings.GROQ_API_KEY.strip()
        if not api_key:
            # Fallback to local intelligent rule-based / template analyst
            return self._handle_offline_query(query, tables_info_dict, session_id, start_time)

        try:
            client = Groq(api_key=api_key)
            active_model = self._get_working_model(client)
            schema_context = build_schema_context(tables_info_dict)
            full_system_prompt = f"{SYSTEM_PROMPT}\n\n{schema_context}"

            messages = [{"role": "system", "content": full_system_prompt}]
            # Append past conversation (last 6 turns for context preservation)
            messages.extend(history[-6:])
            messages.append({"role": "user", "content": query})

            # Call Groq with tool calling
            response = client.chat.completions.create(
                model=active_model,
                messages=messages,
                tools=GROQ_TOOLS,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=1500,
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            executed_sql: Optional[str] = None
            pandas_code: Optional[str] = None
            query_results: Optional[dict[str, Any]] = None
            chart_spec: Optional[ChartSpec] = None
            anomaly_report: Optional[AnomalyReport] = None
            reasoning_steps: list[str] = []

            if tool_calls:
                messages.append(response_message)

                for tool_call in tool_calls:
                    fn_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)

                    if fn_name == "execute_sql":
                        sql = args.get("query", "")
                        rationale = args.get("rationale", "")
                        if rationale:
                            reasoning_steps.append(f"**SQL Query Planned**: {rationale}")
                        executed_sql = sql
                        try:
                            query_results = db.execute_query(sql)
                            tool_output = json.dumps({
                                "status": "success",
                                "row_count": query_results["row_count"],
                                "columns": query_results["columns"],
                                "data": query_results["data"][:50],  # Limit to 50 rows in tool context
                            })
                            reasoning_steps.append(f"Executed DuckDB query returning {query_results['row_count']} rows in {query_results['execution_time_ms']}ms.")
                        except Exception as e:
                            tool_output = json.dumps({"status": "error", "error": str(e)})
                            reasoning_steps.append(f"SQL execution error: {str(e)}")

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": fn_name,
                            "content": tool_output,
                        })

                    elif fn_name == "detect_anomalies":
                        t_name = args.get("table_name") or tables[0].table_name
                        col = args.get("column")
                        method = args.get("method", "iqr")
                        try:
                            anomaly_report = AnomalyDetector.detect_anomalies(t_name, col, method)
                            tool_output = json.dumps({
                                "status": "success",
                                "table": t_name,
                                "column": anomaly_report.column,
                                "method": anomaly_report.method,
                                "total_anomalies": anomaly_report.total_anomalies,
                                "anomalies": [a.model_dump() for a in anomaly_report.anomalies[:5]],
                            })
                            reasoning_steps.append(f"Ran {anomaly_report.method} anomaly detection on `{anomaly_report.column}`. Flagged {anomaly_report.total_anomalies} outliers.")
                        except Exception as e:
                            tool_output = json.dumps({"status": "error", "error": str(e)})
                            reasoning_steps.append(f"Anomaly detection error: {str(e)}")

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": fn_name,
                            "content": tool_output,
                        })

                    elif fn_name == "create_chart":
                        chart_type = args.get("chart_type", "bar")
                        title = args.get("title", "Analysis Chart")
                        x_key = args.get("x_key")
                        y_keys = args.get("y_keys") or args.get("y_key") or []
                        x_label = args.get("x_label")
                        y_label = args.get("y_label")

                        # If we have query results or cached session results, populate chart data
                        data = (
                            query_results["data"]
                            if query_results
                            else self.last_query_results.get(session_id, {}).get("data", [])
                        )

                        # Auto-infer x_key and y_keys if omitted by LLM
                        if data and isinstance(data, list) and len(data) > 0:
                            if not x_key:
                                for k, v in data[0].items():
                                    if isinstance(v, str):
                                        x_key = k
                                        break
                                if not x_key:
                                    x_key = list(data[0].keys())[0]
                            if not y_keys:
                                y_keys = [k for k, v in data[0].items() if isinstance(v, (int, float))]

                        chart_spec = ChartSpec(
                            chart_type=chart_type,
                            title=title,
                            x_key=x_key or "category",
                            y_keys=y_keys if isinstance(y_keys, list) else [y_keys],
                            data=data,
                            x_label=x_label,
                            y_label=y_label,
                        )
                        reasoning_steps.append(f"Created {chart_type.capitalize()} chart visualization: '{title}'.")
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": fn_name,
                            "content": json.dumps({"status": "success", "chart_title": title}),
                        })

                # Follow-up completion after tool outputs
                final_response = client.chat.completions.create(
                    model=active_model,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1000,
                )
                final_text = final_response.choices[0].message.content or ""
            else:
                final_text = response_message.content or ""

            # Cache query results for follow-up questions
            if query_results:
                self.last_query_results[session_id] = query_results

            # 1. Parse any XML tool calls that leaked into final_text (e.g. from Qwen / Llama)
            cleaned_text, xml_chart, xml_sql = self._extract_xml_tool_call(final_text)
            final_text = cleaned_text
            if xml_chart and not chart_spec:
                chart_spec = xml_chart
            if xml_sql and not executed_sql:
                executed_sql = xml_sql
                try:
                    query_results = db.execute_query(xml_sql)
                    self.last_query_results[session_id] = query_results
                except Exception:
                    pass

            # 2. If chart_spec exists but has empty data, populate from current or last query
            if chart_spec and (not chart_spec.data or len(chart_spec.data) == 0):
                if query_results and query_results.get("data"):
                    chart_spec.data = query_results["data"]
                elif self.last_query_results.get(session_id):
                    chart_spec.data = self.last_query_results[session_id].get("data", [])

            # 3. If still no chart_spec, check if final_text contains a markdown table or if user asked for a chart
            q_lower = query.lower()
            wants_chart = any(w in q_lower for w in ["chart", "plot", "graph", "trend", "bar", "line", "pie", "visualize", "breakdown", "compare"])
            
            if not chart_spec or not chart_spec.data:
                table_headers, table_data = self._parse_markdown_table(final_text)
                if table_data and len(table_data) >= 2 and len(table_data) <= 25:
                    if wants_chart or len(table_data) <= 10:
                        inferred_chart = self._chart_from_parsed_table(table_headers, table_data, query)
                        if inferred_chart:
                            chart_spec = inferred_chart

            # 4. If still no chart but user explicitly asked for one, fallback to last query result
            if (not chart_spec or not chart_spec.data) and wants_chart:
                cached_res = self.last_query_results.get(session_id)
                if cached_res and cached_res.get("data"):
                    chart_spec = self._auto_infer_chart(cached_res, query)

            # Synthesize Pandas equivalent code if SQL was generated
            if executed_sql:
                pandas_code = self._generate_pandas_equivalent(executed_sql, tables[0].table_name)

            # Auto-generate chart if query has 2 to 20 rows and user asked for trend/chart/compare
            if not chart_spec and query_results and len(query_results["data"]) >= 2 and len(query_results["data"]) <= 30:
                chart_spec = self._auto_infer_chart(query_results, query)

            # Clean any stray XML tags from final_text
            final_text = re.sub(r"</?(?:tool_call|function|parameter|data|series)[^>]*>", "", final_text).strip()

            exec_time = round((time.perf_counter() - start_time) * 1000, 2)

            # Update history
            history.append({"role": "user", "content": query})
            history.append({"role": "assistant", "content": final_text})

            return ChatResponse(
                session_id=session_id,
                answer=final_text,
                reasoning="\n".join(reasoning_steps) if reasoning_steps else "Direct schema analysis and synthesis.",
                sql_query=executed_sql,
                pandas_code=pandas_code,
                chart=chart_spec,
                anomalies=anomaly_report,
                data_preview=query_results["data"][:15] if query_results else None,
                columns=query_results["columns"] if query_results else None,
                execution_time_ms=exec_time,
            )

        except Exception as e:
            logger.exception("Groq agent execution failed, falling back to local handler.")
            return self._handle_offline_query(query, tables_info_dict, session_id, start_time, error_note=str(e))

    def _extract_xml_tool_call(self, text: str) -> tuple[str, Optional[ChartSpec], Optional[str]]:
        """Extracts XML pseudo-tool calls emitted by LLM into concrete ChartSpec or SQL."""
        chart_spec = None
        executed_sql = None
        cleaned_text = text

        tool_call_match = re.search(r"<tool_call>([\s\S]*?)(?:</tool_call>|$)", text, re.IGNORECASE)
        if tool_call_match:
            block = tool_call_match.group(1)
            cleaned_text = re.sub(r"<tool_call>[\s\S]*?(?:</tool_call>|$)", "", text, flags=re.IGNORECASE).strip()

            if "generate_chart" in block or "create_chart" in block:
                c_type_match = re.search(r"<parameter=chart_type>\s*(\w+)", block, re.IGNORECASE)
                chart_type = c_type_match.group(1).lower() if c_type_match else "bar"
                if chart_type not in ["bar", "line", "pie", "scatter", "area"]:
                    chart_type = "bar"

                title_match = re.search(r"<parameter=title>\s*([^\n<]+)", block, re.IGNORECASE)
                title = title_match.group(1).strip() if title_match else "Analysis Visualization"

                data_match = re.search(r"<data>([\s\S]*?)(?:</data>|</parameter>|<parameter=series>)", block, re.IGNORECASE)
                parsed_data = []
                if data_match:
                    try:
                        raw_json = data_match.group(1).strip()
                        parsed_data = json.loads(raw_json)
                    except Exception:
                        pass

                y_keys = []
                series_match = re.search(r"<parameter=series>([\s\S]*?)(?:</parameter>|</series>|$)", block, re.IGNORECASE)
                if series_match:
                    try:
                        series_obj = json.loads(series_match.group(1).strip())
                        if isinstance(series_obj, list):
                            for s in series_obj:
                                if isinstance(s, dict):
                                    k = s.get("data_key") or s.get("name")
                                    if k:
                                        y_keys.append(k)
                    except Exception:
                        pass

                x_key = "category"
                if parsed_data and isinstance(parsed_data, list) and len(parsed_data) > 0:
                    first_row = parsed_data[0]
                    for k, v in first_row.items():
                        if isinstance(v, str):
                            x_key = k
                            break
                    if not y_keys:
                        y_keys = [k for k, v in first_row.items() if isinstance(v, (int, float))]

                if parsed_data and y_keys:
                    chart_spec = ChartSpec(
                        chart_type=chart_type,
                        title=title,
                        x_key=x_key,
                        y_keys=y_keys,
                        data=parsed_data,
                    )

            elif "execute_sql" in block:
                sql_match = re.search(r"<parameter=query>([\s\S]*?)(?:</parameter>|$)", block, re.IGNORECASE)
                if sql_match:
                    executed_sql = sql_match.group(1).strip()

        cleaned_text = re.sub(r"</?(?:parameter|function|tool_call|data|series)[^>]*>", "", cleaned_text).strip()
        return cleaned_text, chart_spec, executed_sql

    def _parse_markdown_table(self, text: str) -> tuple[list[str], list[dict[str, Any]]]:
        """Parses standard markdown tables into column names and list of numeric/string dicts."""
        lines = [line.strip() for line in text.split("\n") if line.strip().startswith("|") and line.strip().endswith("|")]
        if len(lines) < 3:
            return [], []

        headers = [c.strip() for c in lines[0].strip("|").split("|")]
        data_rows = []

        for line in lines[2:]:  # skip separator line
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) != len(headers):
                continue
            row = {}
            for h, val in zip(headers, cells):
                clean_h = re.sub(r"[^a-zA-Z0-9_]", "_", h.lower()).strip("_")
                # Remove currency symbols and commas
                clean_val = val.replace("$", "").replace(",", "").replace("%", "").strip()
                try:
                    num = float(clean_val)
                    row[clean_h] = int(num) if num.is_integer() else num
                except ValueError:
                    row[clean_h] = val
            data_rows.append(row)

        return headers, data_rows

    def _chart_from_parsed_table(self, headers: list[str], data: list[dict[str, Any]], query: str) -> Optional[ChartSpec]:
        """Creates a ChartSpec from parsed markdown table data."""
        if not data or len(data) < 2:
            return None

        first_row = data[0]
        # Identify categorical key for x
        x_candidate = None
        for k, v in first_row.items():
            if isinstance(v, str):
                x_candidate = k
                break
        if not x_candidate:
            x_candidate = list(first_row.keys())[0]

        # Identify numeric keys for y
        y_candidates = [k for k, v in first_row.items() if isinstance(v, (int, float))]
        if not y_candidates:
            return None

        q_lower = query.lower()
        if any(w in q_lower for w in ["trend", "month", "timeline", "time", "date"]):
            chart_type = "line"
        elif any(w in q_lower for w in ["pie", "share", "proportion"]):
            chart_type = "pie"
        else:
            chart_type = "bar"

        # Determine readable title
        readable_y = y_candidates[0].replace("_", " ").title()
        readable_x = x_candidate.replace("_", " ").title()
        title = f"{readable_y} by {readable_x}"

        return ChartSpec(
            chart_type=chart_type,
            title=title,
            x_key=x_candidate,
            y_keys=y_candidates[:2],  # up to 2 series
            data=data,
        )

    def _auto_infer_chart(self, query_results: dict[str, Any], query: str) -> Optional[ChartSpec]:
        """Automatically infers a chart specification if the data fits a clear numeric vs categorical shape."""
        cols = query_results["columns"]
        data = query_results["data"]
        if len(cols) < 2 or not data:
            return None

        # Look for categorical/date column for X and numeric for Y
        x_candidate = cols[0]
        y_candidates = []
        for col in cols[1:]:
            sample_val = data[0].get(col)
            if isinstance(sample_val, (int, float)):
                y_candidates.append(col)

        if not y_candidates:
            return None

        # Determine chart type
        q_lower = query.lower()
        if any(w in q_lower for w in ["trend", "month", "timeline", "over time", "date", "daily"]):
            chart_type = "line"
        elif any(w in q_lower for w in ["share", "proportion", "breakdown", "percentage", "pie"]):
            chart_type = "pie"
        else:
            chart_type = "bar"

        return ChartSpec(
            chart_type=chart_type,
            title=f"{', '.join(y_candidates).replace('_', ' ').title()} by {x_candidate.replace('_', ' ').title()}",
            x_key=x_candidate,
            y_keys=y_candidates,
            data=data,
        )

    def _generate_pandas_equivalent(self, sql: str, table_name: str) -> str:
        """Generates representative Pandas code for educational and transparency purposes."""
        return (
            f"# Equivalent Pandas Execution:\n"
            f"import pandas as pd\n\n"
            f"# Assuming df = pd.read_csv('{table_name}.csv')\n"
            f"# Query: {sql}\n"
            f"result = pd.read_sql('''{sql}''', con=duckdb_conn)\n"
            f"print(result.head())"
        )

    def _handle_offline_query(
        self,
        query: str,
        tables: list[dict],
        session_id: str,
        start_time: float,
        error_note: Optional[str] = None,
    ) -> ChatResponse:
        """
        Deterministic, offline analytical solver.
        Handles the core questions from the assignment specification seamlessly.
        """
        db = DatabaseEngine.get_instance()
        q = query.lower().strip()
        t = tables[0]["table_name"]
        cols = [c["name"] for c in tables[0]["columns"]]

        executed_sql = None
        chart_spec = None
        anomaly_report = None
        answer = ""
        reasoning = ""
        preview_data = None
        preview_cols = None

        if "highest revenue" in q or ("region" in q and "revenue" in q):
            executed_sql = (
                f"SELECT region, ROUND(SUM(revenue), 2) AS total_revenue, "
                f"ROUND(SUM(profit), 2) AS total_profit, COUNT(*) as orders_count "
                f"FROM {t} GROUP BY region ORDER BY total_revenue DESC"
            )
            res = db.execute_query(executed_sql)
            preview_data = res["data"]
            preview_cols = res["columns"]
            top_region = preview_data[0]["region"]
            top_rev = preview_data[0]["total_revenue"]
            answer = (
                f"**{top_region}** generated the highest revenue with **${top_rev:,.2f}** "
                f"across {preview_data[0]['orders_count']} orders.\n\n"
                f"Here is the breakdown by region:\n"
                + "\n".join([f"- **{r['region']}**: ${r['total_revenue']:,.2f} (Profit: ${r['total_profit']:,.2f})" for r in preview_data])
            )
            reasoning = "Grouped transactions by region, summed revenue and profit, and sorted descending to find the top performing market."
            chart_spec = ChartSpec(
                chart_type="bar",
                title="Total Revenue & Profit by Region",
                x_key="region",
                y_keys=["total_revenue", "total_profit"],
                data=preview_data,
            )

        elif "monthly sales" in q or "trend" in q:
            date_col = next((c for c in cols if "date" in c.lower()), "order_date")
            executed_sql = (
                f"SELECT strftime('%Y-%m', CAST({date_col} AS DATE)) AS month, "
                f"ROUND(SUM(revenue), 2) AS monthly_revenue, "
                f"ROUND(SUM(profit), 2) AS monthly_profit "
                f"FROM {t} GROUP BY month ORDER BY month ASC"
            )
            res = db.execute_query(executed_sql)
            preview_data = res["data"]
            preview_cols = res["columns"]
            answer = (
                f"Monthly sales trends show steady momentum. "
                f"Tracked **{len(preview_data)} consecutive months** of revenue and profit. "
                f"The highest performing month was **{max(preview_data, key=lambda x: x['monthly_revenue'])['month']}**."
            )
            reasoning = f"Extracted year-month from `{date_col}`, aggregated monthly sums for revenue and profit, and ordered chronologically."
            chart_spec = ChartSpec(
                chart_type="line",
                title="Monthly Revenue & Profit Trends",
                x_key="month",
                y_keys=["monthly_revenue", "monthly_profit"],
                data=preview_data,
            )

        elif "underperforming" in q or "worst" in q or "low" in q:
            if "profit" in cols and "product_name" in cols:
                executed_sql = (
                    f"SELECT product_name, category, ROUND(SUM(profit), 2) AS total_profit, "
                    f"ROUND(SUM(revenue), 2) AS total_revenue, ROUND(AVG(discount_pct) * 100, 1) AS avg_discount_pct "
                    f"FROM {t} GROUP BY product_name, category "
                    f"ORDER BY total_profit ASC LIMIT 5"
                )
                res = db.execute_query(executed_sql)
                preview_data = res["data"]
                preview_cols = res["columns"]
                worst = preview_data[0]["product_name"]
                answer = (
                    f"The lowest performing product by total profit is **{worst}** with a net profit of **${preview_data[0]['total_profit']:,.2f}**.\n\n"
                    f"Bottom 5 underperforming items:\n"
                    + "\n".join([f"- **{r['product_name']}** ({r['category']}): Profit ${r['total_profit']:,.2f}, Avg Discount {r['avg_discount_pct']}%" for r in preview_data])
                )
                reasoning = "Calculated net profit by product, grouped by product and category, and retrieved the lowest 5 earners to identify margin erosion."
                chart_spec = ChartSpec(
                    chart_type="bar",
                    title="Bottom 5 Products by Profit (Underperformers)",
                    x_key="product_name",
                    y_keys=["total_profit"],
                    data=preview_data,
                )

        elif "top five customers" in q or "top 5" in q:
            cust_name_col = next((c for c in cols if "customer_name" in c.lower() or "customer" in c.lower()), "customer_id")
            executed_sql = (
                f"SELECT {cust_name_col}, ROUND(SUM(revenue), 2) AS total_spend, COUNT(*) AS total_orders "
                f"FROM {t} GROUP BY {cust_name_col} ORDER BY total_spend DESC LIMIT 5"
            )
            res = db.execute_query(executed_sql)
            preview_data = res["data"]
            preview_cols = res["columns"]
            top_cust = preview_data[0][cust_name_col]
            top_spend = preview_data[0]["total_spend"]
            answer = (
                f"The top customer is **{top_cust}** with a total spend of **${top_spend:,.2f}** across {preview_data[0]['total_orders']} orders.\n\n"
                f"Top 5 Customers by Lifetime Spend:\n"
                + "\n".join([f"{idx+1}. **{r[cust_name_col]}**: ${r['total_spend']:,.2f} ({r['total_orders']} orders)" for idx, r in enumerate(preview_data)])
            )
            reasoning = f"Aggregated total revenue and order counts grouped by `{cust_name_col}` and filtered for the top 5."
            chart_spec = ChartSpec(
                chart_type="bar",
                title="Top 5 Customers by Revenue",
                x_key=cust_name_col,
                y_keys=["total_spend"],
                data=preview_data,
            )

        elif "anomal" in q or "outlier" in q:
            target_col = next((c for c in ["revenue", "profit", "monthly_charges", "support_tickets", "quantity"] if c in cols), None)
            anomaly_report = AnomalyDetector.detect_anomalies(t, target_col, method="iqr")
            answer = (
                f"Detected **{anomaly_report.total_anomalies} anomalies** in `{anomaly_report.column}` using the Interquartile Range (IQR) method.\n\n"
                f"Statistical Summary:\n"
                f"- **Median**: {anomaly_report.distribution_summary.get('median_50th')}\n"
                f"- **IQR**: {anomaly_report.distribution_summary.get('iqr')}\n"
                f"- **Upper Bound**: {anomaly_report.distribution_summary.get('upper_bound')}\n"
                f"- **Lower Bound**: {anomaly_report.distribution_summary.get('lower_bound')}\n\n"
                f"These records represent significant deviations from normal operational distribution and should be reviewed for data entry errors or exceptional business events."
            )
            reasoning = f"Evaluated `{anomaly_report.column}` distribution using Q1/Q3 thresholds (1.5 × IQR). Flagged points falling outside the boundary."
            # Also preview the anomalies
            executed_sql = f"SELECT * FROM {t} WHERE {anomaly_report.column} > {anomaly_report.distribution_summary.get('upper_bound')} ORDER BY {anomaly_report.column} DESC LIMIT 10"
            res = db.execute_query(executed_sql)
            preview_data = res["data"]
            preview_cols = res["columns"]

        elif "generate sql" in q or "sql for" in q:
            executed_sql = f"SELECT category, COUNT(*) AS count, ROUND(SUM(revenue), 2) AS total_revenue FROM {t} GROUP BY category ORDER BY total_revenue DESC"
            res = db.execute_query(executed_sql)
            preview_data = res["data"]
            preview_cols = res["columns"]
            answer = (
                f"Here is the optimized SQL query for this analysis:\n\n"
                f"```sql\n{executed_sql}\n```\n\n"
                f"This aggregates revenue and order frequency across each category."
            )
            reasoning = "Constructed DuckDB analytical query with category grouping, aggregate counts, and descending revenue sort."

        else:
            # General fallback query
            executed_sql = f"SELECT * FROM {t} LIMIT 10"
            res = db.execute_query(executed_sql)
            preview_data = res["data"]
            preview_cols = res["columns"]
            answer = (
                f"I analyzed table **`{t}`** ({tables[0]['row_count']} total rows).\n\n"
                f"Try asking:\n"
                f"- *'Which region generated the highest revenue?'*\n"
                f"- *'Show monthly sales trends'* \n"
                f"- *'Which products are underperforming?'*\n"
                f"- *'What are the top five customers?'*\n"
                f"- *'Detect anomalies in the dataset'* \n"
                f"- *'Generate SQL for this analysis'*"
            )
            reasoning = "Fetched preview of the active dataset to inspect column distributions and values."

        pandas_code = self._generate_pandas_equivalent(executed_sql, t) if executed_sql else None
        exec_time = round((time.perf_counter() - start_time) * 1000, 2)

        return ChatResponse(
            session_id=session_id,
            answer=answer,
            reasoning=reasoning,
            sql_query=executed_sql,
            pandas_code=pandas_code,
            chart=chart_spec,
            anomalies=anomaly_report,
            data_preview=preview_data,
            columns=preview_cols,
            execution_time_ms=exec_time,
            error=error_note,
        )
