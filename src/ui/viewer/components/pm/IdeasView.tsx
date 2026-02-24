import React, { useState, useEffect } from 'react';
import { TagBadge } from '../shared/TagBadge';
import { SearchFilter } from '../shared/SearchFilter';

interface IdeasViewProps {
  currentProject: string;
}

interface IdeaItem {
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
  idea: '#8b5cf6', feature: '#10b981', docs: '#84cc16', 'planned-feature': '#f59e0b',
};

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function IdeasView({ currentProject }: IdeasViewProps) {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentProject) params.set('project', currentProject);
    if (showResolved) params.set('status', 'all');
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/pm/ideas${qs}`)
      .then(r => r.json())
      .then(data => setIdeas(data.ideas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject, showResolved]);

  const filtered = search
    ? ideas.filter(i =>
        (i.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.subtitle || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.narrative || '').toLowerCase().includes(search.toLowerCase()))
    : ideas;

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading ideas...</div>;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Ideas
          <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '8px' }}>({filtered.length})</span>
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.6, cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      <SearchFilter value={search} onChange={setSearch} placeholder="Search ideas..." />

      {filtered.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
          {search ? 'No ideas match your search.' : 'No ideas found. Ideas are auto-tagged from observations containing "idea", "brainstorm", "concept", or "proposal".'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filtered.map(idea => {
            const isResolved = idea.status === 'resolved' || idea.status === 'archived' || idea.status === 'stale';
            return (
            <div
              key={idea.id}
              onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid #8b5cf630',
                background: '#8b5cf608',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                opacity: isResolved ? 0.45 : 1,
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#8b5cf660')}
              onMouseOut={e => (e.currentTarget.style.borderColor = '#8b5cf630')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>#{idea.id}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {isResolved && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: '#374151', color: '#9ca3af' }}>
                      {idea.status}
                    </span>
                  )}
                  <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{formatDate(idea.created_at_epoch)}</span>
                </div>
              </div>
              <div style={{
                fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px',
                textDecoration: isResolved ? 'line-through' : 'none',
              }}>
                {idea.title || idea.subtitle || '(untitled)'}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: expandedId === idea.id ? '8px' : 0 }}>
                {idea.tags.map(tag => (
                  <TagBadge key={tag} name={tag} color={TAG_COLORS[tag] || '#6366f1'} />
                ))}
              </div>

              {expandedId === idea.id && idea.narrative && (
                <div style={{
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-color, #333)',
                  fontSize: '0.8rem',
                  opacity: 0.8,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}>
                  {idea.narrative}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
