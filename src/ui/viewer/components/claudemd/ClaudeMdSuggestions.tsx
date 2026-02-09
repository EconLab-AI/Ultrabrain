import React from 'react';

interface Suggestion {
  id: string;
  type: 'warning' | 'info' | 'optimization';
  title: string;
  description: string;
  filePath: string;
  priority: 'high' | 'medium' | 'low';
  tokenImpact?: number;
}

interface ClaudeMdSuggestionsProps {
  suggestions: Suggestion[];
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<string, { color: string; icon: string }> = {
  warning: { color: '#ef4444', icon: '!' },
  info: { color: '#3b82f6', icon: 'i' },
  optimization: { color: '#f59e0b', icon: '*' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
};

export function ClaudeMdSuggestions({ suggestions, onDismiss }: ClaudeMdSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '12px 16px', opacity: 0.5, fontSize: '0.8rem' }}>
        No suggestions - your CLAUDE.md files look good.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px' }}>
      {suggestions.map(s => {
        const typeStyle = TYPE_STYLES[s.type] || TYPE_STYLES.info;
        return (
          <div
            key={s.id}
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              border: `1px solid var(--border-color, #333)`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: typeStyle.color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              {typeStyle.icon}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.title}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: PRIORITY_COLORS[s.priority] + '22',
                    color: PRIORITY_COLORS[s.priority],
                    fontWeight: 500,
                  }}
                >
                  {s.priority}
                </span>
                {s.tokenImpact !== undefined && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                    ~{s.tokenImpact} tokens
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7, lineHeight: 1.4 }}>
                {s.description}
              </div>
            </div>

            <button
              onClick={() => onDismiss(s.id)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color, #444)',
                color: 'inherit',
                padding: '3px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                opacity: 0.6,
                flexShrink: 0,
              }}
            >
              Dismiss
            </button>
          </div>
        );
      })}
    </div>
  );
}
