import React, { useState, useEffect, useCallback } from 'react';
import { TagBadge } from '../shared/TagBadge';

interface Tag {
  id: number;
  name: string;
  color: string;
  is_system: number;
  created_at_epoch: number;
  usage_count: number;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#dc2626', '#64748b',
];

export function TagsView() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(data => setTags(data.tags || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setError(null);

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create tag');
        return;
      }

      setNewTagName('');
      fetchTags();
    } catch {
      setError('Failed to create tag');
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (tag.is_system) return;
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from all items.`)) return;

    await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
    fetchTags();
  };

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading tags...</div>;
  }

  const systemTags = tags.filter(t => t.is_system);
  const userTags = tags.filter(t => !t.is_system);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px' }}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 600 }}>Tags</h2>

      {/* Create Tag Form */}
      <div style={{
        padding: '16px',
        borderRadius: '10px',
        border: '1px solid var(--border-color, #333)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>Create Tag</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Tag name..."
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #333)',
              background: 'var(--bg-secondary, #1a1a2e)',
              color: 'inherit',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: color,
                  border: newTagColor === color ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent-color, #6366f1)',
              color: '#fff',
              cursor: newTagName.trim() ? 'pointer' : 'not-allowed',
              opacity: newTagName.trim() ? 1 : 0.5,
            }}
          >
            Create
          </button>
        </div>
        {newTagName && (
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Preview: </span>
            <TagBadge name={newTagName} color={newTagColor} size="md" />
          </div>
        )}
        {error && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#ef4444' }}>{error}</div>
        )}
      </div>

      {/* System Tags */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: '10px' }}>
          System Tags ({systemTags.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {systemTags.map(tag => (
            <div key={tag.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #333)',
              fontSize: '0.8rem',
            }}>
              <TagBadge name={tag.name} color={tag.color} size="md" />
              <span style={{ flex: 1 }} />
              <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                {tag.usage_count} item{tag.usage_count !== 1 ? 's' : ''}
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'var(--bg-secondary, #1a1a2e)',
                opacity: 0.5,
              }}>
                system
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User Tags */}
      <div>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: '10px' }}>
          Custom Tags ({userTags.length})
        </h3>
        {userTags.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
            No custom tags yet. Create one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {userTags.map(tag => (
              <div key={tag.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #333)',
                fontSize: '0.8rem',
              }}>
                <TagBadge name={tag.name} color={tag.color} size="md" />
                <span style={{ flex: 1 }} />
                <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                  {tag.usage_count} item{tag.usage_count !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => handleDeleteTag(tag)}
                  style={{
                    background: 'none',
                    border: '1px solid #ef444440',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    color: '#ef4444',
                    cursor: 'pointer',
                    opacity: 0.7,
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
