import React from 'react';

interface SessionMetricsProps {
  totalSessions: number;
  totalObservations: number;
  avgSessionDuration: number;
  avgObservationsPerSession: number;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainMin = minutes % 60;
    return `${hours}h ${remainMin}m`;
  }
  if (minutes > 0) {
    const remainSec = seconds % 60;
    return `${minutes}m ${remainSec}s`;
  }
  return `${seconds}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-secondary, #27272a)',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid var(--border-primary, #3f3f46)',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-secondary, #a1a1aa)',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const valueStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--text-primary, #fafafa)',
  fontFamily: 'monospace',
  lineHeight: 1.2,
};

export function SessionMetrics({
  totalSessions,
  totalObservations,
  avgSessionDuration,
  avgObservationsPerSession,
}: SessionMetricsProps) {
  const metrics = [
    { label: 'Total Sessions', value: formatNumber(totalSessions) },
    { label: 'Total Observations', value: formatNumber(totalObservations) },
    { label: 'Avg Session Duration', value: formatDuration(avgSessionDuration) },
    { label: 'Avg Obs / Session', value: avgObservationsPerSession.toFixed(1) },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      {metrics.map(m => (
        <div key={m.label} style={cardStyle}>
          <div style={titleStyle}>{m.label}</div>
          <div style={valueStyle}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}
