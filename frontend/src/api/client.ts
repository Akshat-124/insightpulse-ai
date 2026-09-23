import { AnomalyReport, ChatMessage, DataQualityReport, SystemHealth, TableInfo } from '../types';

const API_BASE = '/api';

export const apiClient = {
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async listTables(): Promise<TableInfo[]> {
    const res = await fetch(`${API_BASE}/tables`);
    if (!res.ok) throw new Error('Failed to fetch tables');
    return res.json();
  },

  async uploadFiles(files: File[]): Promise<TableInfo[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async loadSampleDatasets(): Promise<TableInfo[]> {
    const res = await fetch(`${API_BASE}/samples/load`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to load sample datasets');
    return res.json();
  },

  async sendChatMessage(query: string, sessionId: string = 'default') {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id: sessionId }),
    });
    if (!res.ok) throw new Error('Chat request failed');
    return res.json();
  },

  async clearChat(sessionId: string = 'default') {
    await fetch(`${API_BASE}/chat/clear?session_id=${sessionId}`, {
      method: 'POST',
    });
  },

  async getDataQuality(tableName: string): Promise<DataQualityReport> {
    const res = await fetch(`${API_BASE}/data/quality/${tableName}`);
    if (!res.ok) throw new Error(`Failed to load data quality for ${tableName}`);
    return res.json();
  },

  async getAnomalies(
    tableName: string,
    column?: string,
    method: string = 'iqr',
    threshold: number = 1.5
  ): Promise<AnomalyReport> {
    const params = new URLSearchParams({ method, threshold: threshold.toString() });
    if (column) params.append('column', column);
    const res = await fetch(`${API_BASE}/data/anomalies/${tableName}?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to load anomalies for ${tableName}`);
    return res.json();
  },

  async exportReport(title: string, tables: string[], messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${API_BASE}/export/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        tables,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          reasoning: m.reasoning,
          sql_query: m.sql_query,
        })),
      }),
    });
    if (!res.ok) throw new Error('Export report failed');
    return res.text();
  },
};
