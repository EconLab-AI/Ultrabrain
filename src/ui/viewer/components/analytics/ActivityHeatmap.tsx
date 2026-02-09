import React, { useState, useMemo } from 'react';

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  days: ActivityDay[];
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LABEL_WIDTH = 30;
const HEADER_HEIGHT = 20;
const WEEKS = 52;

function getColor(count: number): string {
  if (count === 0) return COLORS[0];
  if (count <= 2) return COLORS[1];
  if (count <= 5) return COLORS[2];
  if (count <= 9) return COLORS[3];
  return COLORS[4];
}

function buildGrid(days: ActivityDay[]): { grid: number[][]; dates: string[][] } {
  const dayMap = new Map<string, number>();
  for (const d of days) {
    dayMap.set(d.date, d.count);
  }

  const today = new Date();
  const grid: number[][] = [];
  const dates: string[][] = [];

  // Start from (WEEKS) weeks ago, aligned to Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * 7) + (7 - startDate.getDay()));

  for (let week = 0; week < WEEKS; week++) {
    const weekCounts: number[] = [];
    const weekDates: string[] = [];
    for (let day = 0; day < 7; day++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + week * 7 + day);
      if (current > today) {
        weekCounts.push(-1); // future
        weekDates.push('');
      } else {
        const dateStr = current.toISOString().slice(0, 10);
        weekCounts.push(dayMap.get(dateStr) || 0);
        weekDates.push(dateStr);
      }
    }
    grid.push(weekCounts);
    dates.push(weekDates);
  }

  return { grid, dates };
}

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { grid, dates } = useMemo(() => buildGrid(days), [days]);

  // Compute month label positions
  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    let lastMonth = -1;

    for (let week = 0; week < grid.length; week++) {
      // Check first day of week
      const dateStr = dates[week][0];
      if (!dateStr) continue;
      const month = new Date(dateStr).getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: MONTH_NAMES[month],
          x: LABEL_WIDTH + week * (CELL_SIZE + CELL_GAP),
        });
        lastMonth = month;
      }
    }
    return labels;
  }, [grid, dates]);

  const svgWidth = LABEL_WIDTH + WEEKS * (CELL_SIZE + CELL_GAP);
  const svgHeight = HEADER_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  return (
    <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ display: 'block' }}
      >
        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text
            key={i}
            x={m.x}
            y={12}
            fill="var(--text-secondary, #a1a1aa)"
            fontSize="10"
            fontFamily="monospace"
          >
            {m.label}
          </text>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={HEADER_HEIGHT + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
              fill="var(--text-secondary, #a1a1aa)"
              fontSize="10"
              fontFamily="monospace"
            >
              {label}
            </text>
          ) : null
        )}

        {/* Cells */}
        {grid.map((week, wi) =>
          week.map((count, di) => {
            if (count === -1) return null;
            const x = LABEL_WIDTH + wi * (CELL_SIZE + CELL_GAP);
            const y = HEADER_HEIGHT + di * (CELL_SIZE + CELL_GAP);
            return (
              <rect
                key={`${wi}-${di}`}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColor(count)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const dateStr = dates[wi][di];
                  if (dateStr) {
                    setTooltip({
                      x: x + CELL_SIZE / 2,
                      y: y - 8,
                      text: `${count} observation${count !== 1 ? 's' : ''} on ${dateStr}`,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })
        )}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 80}
              y={tooltip.y - 22}
              width={160}
              height={20}
              rx={4}
              fill="var(--bg-primary, #18181b)"
              stroke="var(--border-primary, #3f3f46)"
              strokeWidth={1}
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 9}
              textAnchor="middle"
              fill="var(--text-primary, #fafafa)"
              fontSize="10"
              fontFamily="monospace"
            >
              {tooltip.text}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary, #a1a1aa)', fontFamily: 'monospace', marginRight: '4px' }}>Less</span>
        {COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              backgroundColor: color,
              borderRadius: '2px',
            }}
          />
        ))}
        <span style={{ fontSize: '10px', color: 'var(--text-secondary, #a1a1aa)', fontFamily: 'monospace', marginLeft: '4px' }}>More</span>
      </div>
    </div>
  );
}
