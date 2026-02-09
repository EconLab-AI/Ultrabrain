import React, { useState, useEffect, useRef } from 'react';
import { TagBadge } from './TagBadge';

interface Tag {
  id: number;
  name: string;
  color: string;
  is_system: number;
}

interface TagSelectorProps {
  itemType: 'observation' | 'summary' | 'task';
  itemId: number;
  currentTags: { id: number; name: string; color: string }[];
  onTagsChanged: () => void;
}

export function TagSelector({ itemType, itemId, currentTags, onTagsChanged }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(data => setAllTags(data.tags || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentTagIds = new Set(currentTags.map(t => t.id));

  const handleToggleTag = async (tag: Tag) => {
    const isAssigned = currentTagIds.has(tag.id);

    if (isAssigned) {
      await fetch(`/api/items/${itemType}/${itemId}/tags/${tag.id}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/items/${itemType}/${itemId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: [tag.id] }),
      });
    }

    onTagsChanged();
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: '1px dashed var(--border-color, #333)',
          borderRadius: '9999px',
          padding: '1px 8px',
          fontSize: '0.65rem',
          cursor: 'pointer',
          color: 'var(--text-muted, #888)',
          opacity: 0.7,
        }}
      >
        + tag
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            marginTop: '4px',
            background: 'var(--bg-secondary, #1a1a2e)',
            border: '1px solid var(--border-color, #333)',
            borderRadius: '8px',
            padding: '8px',
            minWidth: '160px',
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {allTags.map(tag => (
            <div
              key={tag.id}
              onClick={() => handleToggleTag(tag)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.75rem',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover, #ffffff10)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                width: '14px',
                textAlign: 'center',
                fontSize: '0.7rem',
              }}>
                {currentTagIds.has(tag.id) ? '\u2713' : ''}
              </span>
              <TagBadge name={tag.name} color={tag.color} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
