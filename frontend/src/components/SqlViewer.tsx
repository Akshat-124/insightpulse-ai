import React, { useState } from 'react';
import { Check, Copy, Terminal, Code2 } from 'lucide-react';

interface SqlViewerProps {
  sql?: string;
  pandas?: string;
}

export const SqlViewer: React.FC<SqlViewerProps> = ({ sql, pandas }) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'pandas'>('sql');
  const [copied, setCopied] = useState(false);

  if (!sql && !pandas) return null;

  const contentToCopy = activeTab === 'sql' ? (sql || '') : (pandas || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: '#0a0f1d',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginTop: '0.85rem',
      marginBottom: '0.85rem'
    }}>
      {/* Tab Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.4rem 0.8rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {sql && (
            <button
              onClick={() => setActiveTab('sql')}
              style={{
                background: activeTab === 'sql' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'sql' ? '#a5b4fc' : '#64748b',
                border: activeTab === 'sql' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Terminal size={13} />
              DuckDB SQL
            </button>
          )}
          {pandas && (
            <button
              onClick={() => setActiveTab('pandas')}
              style={{
                background: activeTab === 'pandas' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: activeTab === 'pandas' ? '#6ee7b7' : '#64748b',
                border: activeTab === 'pandas' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Code2 size={13} />
              Pandas Python
            </button>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          title="Copy code"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            color: copied ? '#10b981' : '#94a3b8',
            border: 'none',
            borderRadius: '6px',
            padding: '0.25rem 0.55rem',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Body */}
      <pre style={{
        margin: 0,
        padding: '0.85rem 1rem',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-mono)',
        color: '#e2e8f0',
        overflowX: 'auto',
        lineHeight: 1.6
      }}>
        <code>{activeTab === 'sql' ? sql : pandas}</code>
      </pre>
    </div>
  );
};
