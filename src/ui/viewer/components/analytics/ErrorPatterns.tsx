import React, { useMemo } from 'react';

interface ErrorType {
  type: string;
  count: number;
  trend: number;
}

interface DailyError {
  date: string;
  count: number;
}

interface ErrorPatternsProps {
  errors: ErrorType[];
  daily: DailyError[];
}

const ERROR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6',
  '#06b6d4', '#14b8a6', '#84cc16', '#f43f5e', '#a855f7',
];

export function ErrorPatterns({ errors, daily }: ErrorPatternsProps) {
  const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);

  // Build SVG line path for daily trend
  const { path: trendPath, maxCount, points } = useMemo(() => {
    if (daily.length === 0) return { path: '', maxCount: 0, points: [] };

    const max = Math.max(...daily.map(d => d.count), 1);
    const width = 500;
    const height = 120;
    const padding = { top: 10, bottom: 20, left: 0, right: 0 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const pts = daily.map((d, i) => ({
      x: padding.left + (i / Math.max(daily.length - 1, 1)) * chartW,
      y: padding.top + chartH - (d.count / max) * chartH,
      date: d.date,
      count: d.count,
    }));

    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      pathD += ` L ${pts[i].x} ${pts[i].y}`;
    }

    // Area fill path
    const areaD = pathD + ` L ${pts[pts.length - 1].x} ${height - padding.bottom} L ${pts[0].x} ${height - padding.bottom} Z`;

    return { path: pathD, areaPath: areaD, maxCount: max, points: pts };
  }, [daily]);

  if (errors.length === 0 && daily.length === 0) {
    return (
      <div style={{ padding: '2rem', opacity: 0.5, textAlign: 'center' }}>
        No error data available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Error type breakdown - stacked bar */}
      {errors.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #a1a1aa)', marginBottom: '8px', fontFamily: 'monospace' }}>
            Error Types ({totalErrors} total)
          </div>

          {/* Stacked bar */}
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '24px' }}>
            {errors.map((e, i) => {
              const width = totalErrors > 0 ? (e.count / totalErrors) * 100 : 0;
              return (
                <div
                  key={e.type}
                  style={{
                    width: `${width}%`,
                    backgroundColor: ERROR_COLORS[i % ERROR_COLORS.length],
                    minWidth: width > 0 ? '2px' : 0,
                    transition: 'width 0.3s ease',
                  }}
                  title={`${e.type}: ${e.count}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
            {errors.map((e, i) => (
              <div key={e.type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: ERROR_COLORS[i % ERROR_COLORS.length],
                }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #a1a1aa)', fontFamily: 'monospace' }}>
                  {e.type} ({e.count})
                </span>
                {e.trend !== 0 && (
                  <span style={{
                    fontSize: '10px',
                    color: e.trend > 0 ? '#ef4444' : '#22c55e',
                    fontFamily: 'monospace',
                  }}>
                    {e.trend > 0 ? '+' : ''}{e.trend}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily error trend line */}
      {daily.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #a1a1aa)', marginBottom: '8px', fontFamily: 'monospace' }}>
            Daily Error Trend
          </div>
          <svg
            width="100%"
            height={140}
            viewBox="0 0 500 140"
            preserveAspectRatio="xMinYMin meet"
            style={{ display: 'block' }}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = 10 + (1 - ratio) * 90;
              return (
                <line
                  key={ratio}
                  x1={0}
                  y1={y}
                  x2={500}
                  y2={y}
                  stroke="var(--border-primary, #3f3f46)"
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              );
            })}

            {/* Area under curve */}
            {points.length > 1 && (
              <path
                d={`${trendPath} L ${points[points.length - 1].x} 120 L ${points[0].x} 120 Z`}
                fill="#ef4444"
                opacity={0.1}
              />
            )}

            {/* Trend line */}
            <path
              d={trendPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={2}
                fill="#ef4444"
                opacity={0.8}
              >
                <title>{`${p.date}: ${p.count} error${p.count !== 1 ? 's' : ''}`}</title>
              </circle>
            ))}

            {/* Y-axis label */}
            <text x={4} y={16} fill="var(--text-secondary, #a1a1aa)" fontSize="9" fontFamily="monospace">
              {maxCount}
            </text>
            <text x={4} y={118} fill="var(--text-secondary, #a1a1aa)" fontSize="9" fontFamily="monospace">
              0
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
