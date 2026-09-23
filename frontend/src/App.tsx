import React, { useEffect, useState } from 'react';
import { apiClient } from './api/client';
import { ChatMessage, SystemHealth, TableInfo } from './types';
import { Navbar } from './components/Navbar';
import { FileUpload } from './components/FileUpload';
import { ChatInterface } from './components/ChatInterface';
import { DataQualityDrawer } from './components/DataQualityDrawer';
import { Layers, Sparkles, Database } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState<boolean>(false);
  const [isDataDrawerOpen, setIsDataDrawerOpen] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const [h, t] = await Promise.all([apiClient.getHealth(), apiClient.listTables()]);
      setHealth(h);
      setTables(t);
    } catch (e) {
      console.error('Failed to initialize app', e);
    }
  };

  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const loaded = await apiClient.loadSampleDatasets();
      setTables(loaded);
      // Auto-trigger a welcome message or table refresh
      const h = await apiClient.getHealth();
      setHealth(h);
    } catch (e) {
      console.error('Error loading sample datasets', e);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await apiClient.sendChatMessage(query);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: res.answer,
        reasoning: res.reasoning,
        sql_query: res.sql_query,
        pandas_code: res.pandas_code,
        chart: res.chart,
        anomalies: res.anomalies,
        data_preview: res.data_preview,
        columns: res.columns,
        execution_time_ms: res.execution_time_ms,
        error: res.error,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `Error processing query: ${err.message || 'Unknown network error'}. Please verify your connection or check backend logs.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setSelectedPrompt(null);
    }
  };

  const handleClearChat = async () => {
    try {
      await apiClient.clearChat();
      setMessages([]);
    } catch (e) {
      console.error('Error clearing chat', e);
    }
  };

  const handleExportReport = async () => {
    if (messages.length === 0) {
      alert('Please ask at least one question before exporting a report.');
      return;
    }

    try {
      const reportMd = await apiClient.exportReport(
        'Executive AI Data Analysis Report',
        tables.map((t) => t.table_name),
        messages
      );

      // Download file
      const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `InsightPulse_Report_${new Date().toISOString().slice(0, 10)}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export report error', e);
    }
  };

  const topFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTopFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      const newTables = await apiClient.uploadFiles(Array.from(fileList));
      setTables(newTables);
      initApp();
    } catch (e: any) {
      alert(`Upload error: ${e.message || 'Failed to upload CSV'}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="ambient-glow" />

      {/* Hidden file input for Navbar upload button */}
      <input
        ref={topFileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleTopFileUpload(e.target.files)}
      />

      {/* Top Navbar */}
      <Navbar
        health={health}
        onUploadClick={() => topFileInputRef.current?.click()}
        onLoadSamples={handleLoadSamples}
        onExportReport={handleExportReport}
        onToggleDataDrawer={() => setIsDataDrawerOpen(true)}
        isLoadingSamples={isLoadingSamples}
        totalTables={tables.length}
      />

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', maxWidth: '1600px', width: '100%', margin: '0 auto', overflow: 'hidden' }}>
        
        {/* Left Side Panel: Ingestion & Schema */}
        <aside
          className="glass-panel"
          style={{
            width: '360px',
            minWidth: '360px',
            maxWidth: '360px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-glass)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto',
          }}
        >
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={17} color="#6366f1" />
              Dataset Ingestion
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Upload one or more CSVs. DuckDB auto-indexes schema & types in milliseconds.
            </p>
          </div>

          <FileUpload
            onUploadSuccess={(newTables) => {
              setTables(newTables);
              initApp();
            }}
            tables={tables}
          />

          {tables.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => setIsDataDrawerOpen(true)}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.6rem' }}
              >
                <Layers size={15} color="#8b5cf6" />
                Open Data Quality Profiler
              </button>
            </div>
          )}
        </aside>

        {/* Center / Right: Chat Stream & Visualizations */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            isLoading={isLoading}
            selectedPrompt={selectedPrompt}
          />
        </main>

      </div>

      {/* Slide-out Data Quality & Profiler Drawer */}
      <DataQualityDrawer
        isOpen={isDataDrawerOpen}
        onClose={() => setIsDataDrawerOpen(false)}
        tables={tables}
        onSelectPrompt={(p) => setSelectedPrompt(p)}
      />
    </div>
  );
};
