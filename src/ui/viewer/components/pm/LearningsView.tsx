import React, { useState, useEffect } from 'react';
import { TagBadge } from '../shared/TagBadge';

interface LearningsViewProps {
  currentProject: string;
}

interface LearningItem {
  id: number;
  type: string;
  title: string | null;
  subtitle: string | null;
  narrative: string | null;
  project: string;
  created_at_epoch: number;
  status?: string;
  relevance_score?: number;
  tags: string[];
}

const TAG_COLORS: Record<string, string> = {
  learning: '#06b6d4', decision: '#3b82f6', idea: '#8b5cf6', 'planned-feature': '#f59e0b',
};

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function LearningsView({ currentProject }: LearningsViewProps) {
  const [learnings, setLearnings] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentProject) params.set('project', currentProject);
    if (showResolved) params.set('status', 'all');
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/pm/learnings${qs}`)
      .then(r => r.json())
      .then(data => setLearnings(data.learnings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject, showResolved]);

  const filtered = search
    ? learnings.filter(l =>
        (l.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.narrative || '').toLowerCase().includes(search.toLowerCase())
      )
    : learnings;

  // Group by date
  const grouped = new Map<string, LearningItem[]>();
  for (const item of filtered) {
    const dateKey = new Date(item.created_at_epoch).toDateString();
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(item);
  }

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading learnings...</div>;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Learnings & Decisions
          <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '8px' }}>({filtered.length})</span>
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.6, cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search learnings..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '0.85rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
          background: 'var(--bg-secondary, #1a1a2e)',
          color: 'inherit',
          marginBottom: '1rem',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
          {search ? 'No learnings match your search.' : 'No learnings found. Learnings are auto-tagged from observations with type "discovery" or keywords like "learn", "discover", "insight".'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Array.from(grouped.entries()).map(([dateKey, items]) => (
            <div key={dateKey}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0.5,
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: '1px solid var(--border-color, #333)',
              }}>
                {formatDateHeader(items[0].created_at_epoch)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map(item => {
                  const isResolved = item.status === 'resolved' || item.status === 'archived' || item.status === 'stale';
                  return (
                  <div
                    key={item.id}
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #333)',
                      borderLeft: `3px solid ${item.tags.includes('decision') ? '#3b82f6' : '#06b6d4'}`,
                      cursor: 'pointer',
                      opacity: isResolved ? 0.45 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>#{item.id}</span>
                      <span style={{
                        flex: 1, fontSize: '0.85rem', fontWeight: 500,
                        textDecoration: isResolved ? 'line-through' : 'none',
                      }}>
                        {item.title || item.subtitle || '(untitled)'}
                      </span>
                      {isResolved && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: '#374151', color: '#9ca3af' }}>
                          {item.status}
                        </span>
                      )}
                      <span style={{ display: 'flex', gap: '4px' }}>
                        {item.tags.map(tag => (
                          <TagBadge key={tag} name={tag} color={TAG_COLORS[tag] || '#6366f1'} />
                        ))}
                      </span>
                      <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>
                        {new Date(item.created_at_epoch).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {expandedId === item.id && item.narrative && (
                      <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-color, #333)',
                        fontSize: '0.8rem',
                        opacity: 0.8,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {item.narrative}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
