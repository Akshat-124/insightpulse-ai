import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Sparkles, BrainCircuit, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { ChatMessage } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { SqlViewer } from './SqlViewer';
import { AnomalyCardList } from './AnomalyCardList';
import { DataTablePreview } from './DataTablePreview';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showReasoning, setShowReasoning] = useState(false);

  // Sanitize content: remove any lingering <tool_call> XML tags if present
  const sanitizedContent = message.content
    ? message.content
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
        .replace(/<function=[\s\S]*?<\/parameter>/gi, '')
        .trim()
    : '';

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.85rem',
        padding: '1.4rem 1.6rem',
        background: isUser ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.55)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: isUser ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isUser ? 'none' : '0 0 16px rgba(99, 102, 241, 0.35)',
        }}
      >
        {isUser ? <User size={18} color="#cbd5e1" /> : <Sparkles size={18} color="#ffffff" />}
      </div>

      {/* Content Container */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header line with Name and Latency */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
              {isUser ? 'You' : 'InsightPulse AI'}
            </span>
            {!isUser && (
              <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}>
                Senior Analyst
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {message.execution_time_ms !== undefined && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                <Clock size={12} />
                {message.execution_time_ms}ms
              </span>
            )}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
              {message.timestamp}
            </span>
          </div>
        </div>

        {/* Collapsible Reasoning Process for Assistant */}
        {!isUser && message.reasoning && (
          <div style={{ marginBottom: '0.9rem' }}>
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '6px',
                padding: '0.35rem 0.7rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#a5b4fc',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
            >
              <BrainCircuit size={14} color="#818cf8" />
              <span>{showReasoning ? 'Hide Analytical Reasoning' : 'View Analytical Reasoning & Thought Process'}</span>
              {showReasoning ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showReasoning && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderLeft: '3px solid #6366f1',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '0.78rem',
                  lineHeight: 1.6,
                  color: '#cbd5e1',
                }}
              >
                {message.reasoning.split('\n').map((line, idx) => (
                  <p key={idx} style={{ marginBottom: '0.3rem' }}>{line}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Chart if present (Rendered prominently right before or after text) */}
        {message.chart && <ChartRenderer spec={message.chart} />}

        {/* Formatted Markdown Content */}
        <div className="markdown-content" style={{ fontSize: '0.88rem', color: '#f1f5f9', lineHeight: 1.65 }}>
          {isUser ? (
            <p style={{ margin: 0 }}>{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0.8rem 0 0.4rem' }} {...props} />,
                h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0.7rem 0 0.35rem' }} {...props} />,
                h3: ({ node, ...props }) => <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#e2e8f0', margin: '0.6rem 0 0.3rem' }} {...props} />,
                p: ({ node, ...props }) => <p style={{ margin: '0 0 0.6rem 0' }} {...props} />,
                ul: ({ node, ...props }) => <ul style={{ margin: '0 0 0.6rem 1.2rem', padding: 0 }} {...props} />,
                ol: ({ node, ...props }) => <ol style={{ margin: '0 0 0.6rem 1.2rem', padding: 0 }} {...props} />,
                li: ({ node, ...props }) => <li style={{ margin: '0.2rem 0' }} {...props} />,
                strong: ({ node, ...props }) => <strong style={{ color: '#ffffff', fontWeight: 700 }} {...props} />,
                table: ({ node, ...props }) => (
                  <div style={{ overflowX: 'auto', margin: '0.85rem 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }} {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => <thead style={{ background: 'rgba(99, 102, 241, 0.12)', borderBottom: '1px solid rgba(255,255,255,0.1)' }} {...props} />,
                th: ({ node, ...props }) => <th style={{ padding: '0.55rem 0.85rem', color: '#cbd5e1', fontWeight: 700, whiteSpace: 'nowrap' }} {...props} />,
                tbody: ({ node, ...props }) => <tbody {...props} />,
                tr: ({ node, ...props }) => <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} {...props} />,
                td: ({ node, ...props }) => <td style={{ padding: '0.5rem 0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }} {...props} />,
                code: ({ node, ...props }) => (
                  <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#a5b4fc' }} {...props} />
                ),
              }}
            >
              {sanitizedContent}
            </ReactMarkdown>
          )}
        </div>

        {/* Anomaly Cards if present */}
        {message.anomalies && <AnomalyCardList report={message.anomalies} />}

        {/* Data Table Preview if present */}
        {message.data_preview && message.columns && (
          <DataTablePreview columns={message.columns} data={message.data_preview} />
        )}

        {/* SQL & Pandas Inspector if present */}
        {(message.sql_query || message.pandas_code) && (
          <SqlViewer sql={message.sql_query} pandas={message.pandas_code} />
        )}

        {/* Error notification if any */}
        {message.error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.6rem',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            color: '#fda4af',
            fontSize: '0.74rem',
          }}>
            <AlertCircle size={14} />
            <span>Note: {message.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
