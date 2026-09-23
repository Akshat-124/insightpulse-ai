import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Database, FileSpreadsheet, Layers, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { DataQualityReport, TableInfo } from '../types';

interface DataQualityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableInfo[];
  onSelectPrompt: (prompt: string) => void;
}

export const DataQualityDrawer: React.FC<DataQualityDrawerProps> = ({
  isOpen,
  onClose,
  tables,
  onSelectPrompt,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0].table_name);
    }
  }, [tables, selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      loadQualityReport(selectedTable);
    }
  }, [selectedTable]);

  const loadQualityReport = async (tableName: string) => {
    setIsLoading(true);
    try {
      const report = await apiClient.getDataQuality(tableName);
      setQualityReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '460px',
      maxWidth: '90vw',
      background: 'rgba(10, 15, 29, 0.96)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--border-glass)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.6)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.2rem 1.4rem',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={18} color="#6366f1" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
            Data Quality & Profiler
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Table Selector Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.8rem 1.4rem',
        borderBottom: '1px solid var(--border-glass)',
        overflowX: 'auto',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        {tables.map((t) => (
          <button
            key={t.table_name}
            onClick={() => setSelectedTable(t.table_name)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: selectedTable === t.table_name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedTable === t.table_name ? '#a5b4fc' : '#94a3b8',
              border: selectedTable === t.table_name ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {t.table_name} ({t.row_count.toLocaleString()} rows)
          </button>
        ))}
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            Profiling dataset health & distributions...
          </div>
        ) : qualityReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* KPI Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
              <div className="glass-card" style={{ padding: '0.9rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Completeness Score</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: qualityReport.completeness_score > 95 ? '#10b981' : '#f59e0b' }}>
                    {qualityReport.completeness_score}%
                  </h4>
                  <CheckCircle2 size={16} color="#10b981" />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.9rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Duplicate Rows</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: qualityReport.duplicate_rows === 0 ? '#10b981' : '#f43f5e' }}>
                    {qualityReport.duplicate_rows}
                  </h4>
                  {qualityReport.duplicate_rows > 0 && <AlertCircle size={16} color="#f43f5e" />}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card" style={{ padding: '1rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem', display: 'block' }}>
                Instant Analysis Prompts for {selectedTable}:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button
                  onClick={() => {
                    onSelectPrompt(`Detect anomalies in the ${selectedTable} dataset.`);
                    onClose();
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-start' }}
                >
                  <Sparkles size={13} color="#f59e0b" />
                  Detect anomalies in {selectedTable}
                </button>
                <button
                  onClick={() => {
                    onSelectPrompt(`Generate a high-level summary and key business trends for ${selectedTable}.`);
                    onClose();
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', justifyContent: 'flex-start' }}
                >
                  <FileSpreadsheet size={13} color="#6366f1" />
                  Summarize key performance indicators
                </button>
              </div>
            </div>

            {/* Column Level Breakdown */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.8rem' }}>
                Column Health & Distributions ({qualityReport.column_profiles.length} columns)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {qualityReport.column_profiles.map((cp) => (
                  <div
                    key={cp.name}
                    style={{
                      padding: '0.7rem 0.9rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                        {cp.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {cp.dtype}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>Unique: {cp.unique_count.toLocaleString()}</span>
                      <span>Missing: {cp.null_count} ({cp.null_percentage}%)</span>
                    </div>

                    {cp.mean_val !== null && cp.mean_val !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        <span>Range: [{cp.min_val} to {cp.max_val}]</span>
                        <span>Avg: {cp.mean_val}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
