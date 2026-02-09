import React from 'react';

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function TagBadge({ name, color, onRemove, onClick, size = 'sm' }: TagBadgeProps) {
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem';
  const padding = size === 'sm' ? '1px 6px' : '2px 8px';

  return (
    <span
      className="tag-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        fontSize,
        fontWeight: 500,
        borderRadius: '9999px',
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0',
            fontSize: '0.8em',
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          x
        </button>
      )}
    </span>
  );
}
