export interface ColumnInfo {
  name: string;
  data_type: string;
  nullable: boolean;
}

export interface TableInfo {
  table_name: string;
  row_count: number;
  column_count: number;
  columns: ColumnInfo[];
  sample_rows: Record<string, any>[];
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: any[];
  min_val?: number | string | null;
  max_val?: number | string | null;
  mean_val?: number | null;
}

export interface DataQualityReport {
  table_name: string;
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  completeness_score: number;
  column_profiles: ColumnProfile[];
}

export interface AnomalyItem {
  identifier: string | number;
  column: string;
  value: any;
  score: number;
  reason: string;
}

export interface AnomalyReport {
  table_name: string;
  column: string;
  method: string;
  threshold: number;
  total_anomalies: number;
  anomalies: AnomalyItem[];
  distribution_summary: Record<string, any>;
}

export interface ChartSpec {
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, any>[];
  x_label?: string;
  y_label?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  sql_query?: string;
  pandas_code?: string;
  chart?: ChartSpec;
  anomalies?: AnomalyReport;
  data_preview?: Record<string, any>[];
  columns?: string[];
  execution_time_ms?: number;
  error?: string;
  timestamp: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  groq_configured: boolean;
  groq_model: string;
  tables_loaded: number;
}
