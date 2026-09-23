GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_sql",
            "description": "Execute a DuckDB SQL query against the loaded tables to retrieve exact analytical metrics, aggregates, rankings, and filtered records.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The ANSI SQL / DuckDB query to execute. Must be a SELECT or WITH statement.",
                    },
                    "rationale": {
                        "type": "string",
                        "description": "Short explanation of why this query answers the user question.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detect_anomalies",
            "description": "Run statistical anomaly detection (IQR or Z-Score) on a numerical column in a dataset to detect outliers and unusual spikes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Name of the table to inspect.",
                    },
                    "column": {
                        "type": "string",
                        "description": "The specific numeric column to analyze for anomalies (e.g. revenue, quantity, profit, tickets).",
                    },
                    "method": {
                        "type": "string",
                        "enum": ["iqr", "zscore"],
                        "description": "Statistical method to use ('iqr' for non-normal or skewed data, 'zscore' for standard deviations from mean).",
                    },
                },
                "required": ["table_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_chart",
            "description": "Configure an interactive data visualization (Bar, Line, Pie, Scatter, Area) for the frontend based on the query results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "line", "pie", "scatter", "area"],
                        "description": "Type of visualization to display.",
                    },
                    "title": {
                        "type": "string",
                        "description": "Descriptive title for the chart.",
                    },
                    "x_key": {
                        "type": "string",
                        "description": "Column name from the query result to use as the X-axis or categorical dimension.",
                    },
                    "y_keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "One or more numerical column names from the query result to plot on the Y-axis.",
                    },
                    "x_label": {
                        "type": "string",
                        "description": "Optional label for X-axis.",
                    },
                    "y_label": {
                        "type": "string",
                        "description": "Optional label for Y-axis.",
                    },
                },
                "required": ["chart_type", "title", "x_key", "y_keys"],
            },
        },
    },
]
