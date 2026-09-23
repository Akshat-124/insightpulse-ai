import React from 'react';
import { Database, Download, FileSpreadsheet, Sparkles, Terminal, Activity, UploadCloud } from 'lucide-react';
import { SystemHealth } from '../types';

interface NavbarProps {
  health: SystemHealth | null;
  onUploadClick: () => void;
  onLoadSamples: () => void;
  onExportReport: () => void;
  onToggleDataDrawer: () => void;
  isLoadingSamples: boolean;
  totalTables: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  onUploadClick,
  onLoadSamples,
  onExportReport,
  onToggleDataDrawer,
  isLoadingSamples,
  totalTables,
}) => {
  return (
    <header className="glass-panel" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-glass)' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                InsightPulse AI
              </span>
              <span className="badge badge-indigo">
                Copilot
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Autonomous Data Analyst • DuckDB & Groq Engine
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Model Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: health?.groq_configured ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {health?.groq_configured ? (
                <>Engine: <strong style={{ color: '#f8fafc' }}>Groq Llama-3.3-70B</strong></>
              ) : (
                <>Engine: <strong style={{ color: '#f8fafc' }}>Fast Analytical Solver</strong></>
              )}
            </span>
          </div>

          {/* Direct Upload CSV Button */}
          <button
            onClick={onUploadClick}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
          >
            <UploadCloud size={16} />
            Upload CSV
          </button>

          {/* Quick Load Sample Data Button */}
          <button
            onClick={onLoadSamples}
            disabled={isLoadingSamples}
            className="btn-secondary"
            title="Pre-loads Ecommerce & SaaS datasets with built-in anomalies"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
          >
            <FileSpreadsheet size={16} color="#8b5cf6" />
            {isLoadingSamples ? 'Loading...' : 'Load Sample Data'}
          </button>

          {/* Data Explorer & Quality Drawer */}
          <button
            onClick={onToggleDataDrawer}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
          >
            <Database size={16} color="#6366f1" />
            <span>Datasets ({totalTables})</span>
          </button>

          {/* Export Report */}
          <button
            onClick={onExportReport}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
          >
            <Download size={15} />
            Export Report
          </button>
        </div>

      </div>
    </header>
  );
};
