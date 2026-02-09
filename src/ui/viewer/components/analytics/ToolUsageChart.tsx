import React from 'react';

interface ToolUsageData {
  name: string;
  count: number;
  percentage: number;
}

interface ToolUsageChartProps {
  tools: ToolUsageData[];
}

const ACCENT = '#8b5cf6';
const BAR_HEIGHT = 24;
const LABEL_WIDTH = 160;
const COUNT_WIDTH = 60;
const MAX_TOOLS = 15;

function getBarColor(index: number, total: number): string {
  const hue = 260;
  const lightness = 45 + (index / Math.max(total - 1, 1)) * 20;
  return `hsl(${hue}, 60%, ${lightness}%)`;
}

export function ToolUsageChart({ tools }: ToolUsageChartProps) {
  const displayed = tools.slice(0, MAX_TOOLS);
  const maxCount = displayed.length > 0 ? displayed[0].count : 1;

  if (displayed.length === 0) {
    return (
      <div style={{ padding: '2rem', opacity: 0.5, textAlign: 'center' }}>
        No tool usage data available
      </div>
    );
  }

  const chartWidth = 600;
  const barAreaWidth = chartWidth - LABEL_WIDTH - COUNT_WIDTH;
  const svgHeight = displayed.length * (BAR_HEIGHT + 6) + 10;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${chartWidth} ${svgHeight}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ display: 'block' }}
      >
        {displayed.map((tool, i) => {
          const y = i * (BAR_HEIGHT + 6) + 5;
          const barWidth = Math.max((tool.count / maxCount) * barAreaWidth, 2);
          const color = getBarColor(i, displayed.length);

          return (
            <g key={tool.name}>
              {/* Tool name label */}
              <text
                x={LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--text-secondary, #a1a1aa)"
                fontSize="12"
                fontFamily="monospace"
              >
                {tool.name.length > 22 ? tool.name.slice(0, 20) + '..' : tool.name}
              </text>

              {/* Background bar */}
              <rect
                x={LABEL_WIDTH}
                y={y}
                width={barAreaWidth}
                height={BAR_HEIGHT}
                rx={4}
                fill="var(--bg-tertiary, #27272a)"
                opacity={0.3}
              />

              {/* Value bar */}
              <rect
                x={LABEL_WIDTH}
                y={y}
                width={barWidth}
                height={BAR_HEIGHT}
                rx={4}
                fill={color}
                opacity={0.85}
              />

              {/* Count label */}
              <text
                x={LABEL_WIDTH + barAreaWidth + 8}
                y={y + BAR_HEIGHT / 2 + 1}
                dominantBaseline="middle"
                fill="var(--text-primary, #fafafa)"
                fontSize="12"
                fontFamily="monospace"
                fontWeight="600"
              >
                {tool.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
