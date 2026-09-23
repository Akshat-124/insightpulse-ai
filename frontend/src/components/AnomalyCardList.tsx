import React from 'react';
import { AlertTriangle, TrendingUp, HelpCircle } from 'lucide-react';
import { AnomalyReport } from '../types';

interface AnomalyCardListProps {
  report: AnomalyReport;
}

export const AnomalyCardList: React.FC<AnomalyCardListProps> = ({ report }) => {
  const { table_name, column, method, total_anomalies, anomalies, distribution_summary } = report;

  return (
    <div className="glass-card" style={{ padding: '1.2rem', marginTop: '1rem', marginBottom: '1rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={16} color="#f59e0b" />
          </div>
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
              Statistical Anomalies Detected in <span style={{ color: '#f59e0b' }}>`{column}`</span>
            </h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Engine: {method} Algorithm • {total_anomalies} outliers flagged
            </p>
          </div>
        </div>

        <span className="badge badge-amber">
          {total_anomalies} FLAGGED
        </span>
      </div>

      {/* Distribution Summary Pills */}
      {distribution_summary && Object.keys(distribution_summary).length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.6rem 0.8rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.74rem'
        }}>
          {Object.entries(distribution_summary).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: '0.3rem', color: 'var(--text-muted)' }}>
              <span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
              <strong style={{ color: '#f8fafc' }}>{typeof v === 'number' ? v.toLocaleString() : String(v)}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Anomaly Records List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {anomalies.map((item, idx) => (
          <div
            key={`anomaly-${idx}`}
            style={{
              padding: '0.75rem 0.9rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  {item.identifier}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b' }}>
                  Value: {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                Deviation Score: {item.score}
              </span>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Why flagged:</strong> {item.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
