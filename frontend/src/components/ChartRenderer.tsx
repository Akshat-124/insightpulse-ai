import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from 'lucide-react';
import { ChartSpec } from '../types';

interface ChartRendererProps {
  spec: ChartSpec;
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ spec }) => {
  const { chart_type, title, x_key, y_keys, data } = spec;

  if (!data || data.length === 0) {
    return null;
  }

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '0.6rem 0.9rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.3rem' }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
              <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
              <span style={{ fontWeight: 600, color: '#ffffff' }}>
                {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderIcon = () => {
    switch (chart_type) {
      case 'line':
        return <LineIcon size={18} color="#6366f1" />;
      case 'pie':
        return <PieIcon size={18} color="#ec4899" />;
      default:
        return <BarChart3 size={18} color="#10b981" />;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem', marginTop: '1rem', marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {renderIcon()}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            {title}
          </h4>
        </div>
        <span className="badge badge-indigo">
          {chart_type.toUpperCase()} CHART
        </span>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart_type === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey={x_key} stroke="#64748b" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {y_keys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.replace(/_/g, ' ').toUpperCase()}
                  stroke={PALETTE[idx % PALETTE.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: PALETTE[idx % PALETTE.length], strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          ) : chart_type === 'pie' ? (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Pie
                data={data}
                dataKey={y_keys[0]}
                nameKey={x_key}
                cx="50%"
                cy="50%"
                outerRadius={105}
                innerRadius={55}
                paddingAngle={4}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : chart_type === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey={x_key} stroke="#64748b" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {y_keys.map((key) => (
                <Area key={key} type="monotone" dataKey={key} stroke="#6366f1" fillOpacity={1} fill="url(#areaGradient)" />
              ))}
            </AreaChart>
          ) : (
            /* Default Bar Chart */
            <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey={x_key} stroke="#64748b" fontSize={11} tickLine={false} dy={8} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {y_keys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key.replace(/_/g, ' ').toUpperCase()}
                  fill={PALETTE[idx % PALETTE.length]}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={55}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
