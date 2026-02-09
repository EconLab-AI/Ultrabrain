import React, { useState, useEffect } from 'react';
import { TagBadge } from '../shared/TagBadge';
import { SearchFilter } from '../shared/SearchFilter';

interface BugsViewProps {
  currentProject: string;
}

interface BugItem {
  id: number;
  type: string;
  title: string | null;
  subtitle: string | null;
  narrative: string | null;
  project: string;
  created_at_epoch: number;
  tags: string[];
}

const TAG_COLORS: Record<string, string> = {
  bug: '#ef4444', fix: '#f97316', security: '#dc2626', performance: '#ec4899',
  todo: '#f59e0b', feature: '#10b981', refactor: '#6366f1', 'planned-feature': '#f59e0b',
};

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function BugsView({ currentProject }: BugsViewProps) {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = currentProject ? `?project=${encodeURIComponent(currentProject)}` : '';
    fetch(`/api/pm/bugs${params}`)
      .then(r => r.json())
      .then(data => setBugs(data.bugs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject]);

  const filtered = search
    ? bugs.filter(b =>
        (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.subtitle || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.narrative || '').toLowerCase().includes(search.toLowerCase()))
    : bugs;

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading bugs...</div>;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 600 }}>
        Bugs & Fixes
        <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '8px' }}>({filtered.length})</span>
      </h2>

      <SearchFilter value={search} onChange={setSearch} placeholder="Search bugs..." />

      {filtered.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
          {search ? 'No bugs match your search.' : 'No bugs found. Run "Backfill Tags" from Overview to label existing observations.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(bug => (
            <div
              key={bug.id}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #333)',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expandedId === bug.id ? null : bug.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: bug.tags.includes('fix') ? '#10b981' : '#ef4444',
                  flexShrink: 0,
                }} />
                <span style={{ opacity: 0.4, fontSize: '0.7rem', minWidth: '30px' }}>#{bug.id}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>
                  {bug.title || bug.subtitle || '(untitled)'}
                </span>
                <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {bug.tags.map(tag => (
                    <TagBadge key={tag} name={tag} color={TAG_COLORS[tag] || '#6366f1'} />
                  ))}
                </span>
                <span style={{ opacity: 0.4, fontSize: '0.7rem', flexShrink: 0 }}>
                  {formatDate(bug.created_at_epoch)}
                </span>
              </div>

              {expandedId === bug.id && bug.narrative && (
                <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-color, #333)',
                  fontSize: '0.8rem',
                  opacity: 0.8,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}>
                  {bug.narrative}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
