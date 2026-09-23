import React from 'react';
import { Table as TableIcon } from 'lucide-react';

interface DataTablePreviewProps {
  columns: string[];
  data: Record<string, any>[];
  totalRows?: number;
}

export const DataTablePreview: React.FC<DataTablePreviewProps> = ({ columns, data, totalRows }) => {
  if (!data || data.length === 0 || !columns || columns.length === 0) return null;

  return (
    <div style={{
      marginTop: '0.85rem',
      marginBottom: '0.85rem',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(15, 23, 42, 0.6)',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.8rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: '#94a3b8' }}>
          <TableIcon size={14} color="#6366f1" />
          <span>Result Preview ({data.length} {totalRows && totalRows > data.length ? `of ${totalRows}` : ''} rows)</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {columns.map((col) => (
                <th key={col} style={{ padding: '0.5rem 0.8rem', color: '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={`row-${rowIdx}`}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                }}
              >
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td key={`${rowIdx}-${col}`} style={{ padding: '0.45rem 0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
