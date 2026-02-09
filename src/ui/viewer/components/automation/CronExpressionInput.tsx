import React, { useState, useEffect } from 'react';

interface CronExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
}

interface CronPreset {
  label: string;
  expression: string;
  description: string;
}

const PRESETS: CronPreset[] = [
  { label: 'Every minute', expression: '* * * * *', description: 'Runs every minute' },
  { label: 'Every hour', expression: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Daily at 8am', expression: '0 8 * * *', description: 'Runs daily at 8:00 AM' },
  { label: 'Weekly Mon 9am', expression: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
  { label: 'Monthly 1st', expression: '0 0 1 * *', description: 'Runs on the 1st of every month at midnight' },
];

function describeCron(expr: string): string {
  if (!expr) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron expression (needs 5 fields)';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const preset = PRESETS.find(p => p.expression === expr);
  if (preset) return preset.description;

  const segments: string[] = [];

  if (minute === '*' && hour === '*') {
    segments.push('Every minute');
  } else if (minute === '0' && hour === '*') {
    segments.push('Every hour');
  } else if (minute.includes('/')) {
    segments.push(`Every ${minute.split('/')[1]} minutes`);
  } else if (hour === '*') {
    segments.push(`At minute ${minute} of every hour`);
  } else if (hour.includes('/')) {
    segments.push(`At minute ${minute}, every ${hour.split('/')[1]} hours`);
  } else {
    segments.push(`At ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
  }

  if (dayOfMonth !== '*') {
    segments.push(`on day ${dayOfMonth}`);
  }

  if (month !== '*') {
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    segments.push(`in ${months[parseInt(month)] || month}`);
  }

  if (dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNum = parseInt(dayOfWeek);
    segments.push(`on ${days[dayNum] || dayOfWeek}`);
  }

  return segments.join(' ');
}

export function CronExpressionInput({ value, onChange }: CronExpressionInputProps) {
  const [description, setDescription] = useState('');

  useEffect(() => {
    setDescription(describeCron(value));
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {PRESETS.map(preset => (
          <button
            key={preset.expression}
            type="button"
            onClick={() => onChange(preset.expression)}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: value === preset.expression
                ? '1px solid var(--accent-color, #6366f1)'
                : '1px solid var(--border-color, #333)',
              background: value === preset.expression
                ? 'var(--accent-color, #6366f1)'
                : 'transparent',
              color: value === preset.expression
                ? '#fff'
                : 'var(--text-color, #e0e0e0)',
              cursor: 'pointer',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="* * * * * (min hour day month weekday)"
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid var(--border-color, #333)',
          background: 'var(--input-bg, #1a1a2e)',
          color: 'var(--text-color, #e0e0e0)',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
        }}
      />

      {description && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #888)',
          padding: '4px 0',
        }}>
          {description}
        </div>
      )}
    </div>
  );
}
