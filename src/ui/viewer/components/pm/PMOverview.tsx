import React, { useState, useEffect } from 'react';
import { TagBadge } from '../shared/TagBadge';
import { ProjectFilter } from '../shared/ProjectFilter';
import type { ViewType } from '../LeftSidebar';

interface PMOverviewProps {
  currentProject: string;
  projects: string[];
  onNavigate: (view: ViewType) => void;
  onProjectChange: (project: string) => void;
}

interface OverviewData {
  bugs: number;
  todos: number;
  ideas: number;
  learnings: number;
  tasksOpen: number;
  tasksInProgress: number;
  recent: { id: number; type: string; title: string; subtitle: string; project: string; created_at_epoch: number; tags: string[] }[];
}

const TAG_COLORS: Record<string, string> = {
  bug: '#ef4444', todo: '#f59e0b', idea: '#8b5cf6', learning: '#06b6d4',
  decision: '#3b82f6', feature: '#10b981', fix: '#f97316', refactor: '#6366f1',
  performance: '#ec4899', security: '#dc2626', devops: '#64748b', docs: '#84cc16',
  'planned-feature': '#f59e0b',
};

function formatTimeAgo(epoch: number): string {
  const diff = Date.now() - epoch;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PMOverview({ currentProject, projects, onNavigate, onProjectChange }: PMOverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [codeProjects, setCodeProjects] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/projects/stats?source=claude-code')
      .then(r => r.json())
      .then(resp => {
        const list = Array.isArray(resp) ? resp : resp.projects || [];
        const names = list.map((s: any) => s.name || s.project).filter(Boolean);
        setCodeProjects(names);
      })
      .catch(() => {});
  }, []);

  const fetchData = () => {
    const params = currentProject ? `?project=${encodeURIComponent(currentProject)}` : '';
    fetch(`/api/pm/overview${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentProject]);

  const handleBackfill = async () => {
    setBackfillStatus('Running...');
    try {
      const res = await fetch('/api/pm/backfill-tags', { method: 'POST' });
      const result = await res.json();
      setBackfillStatus(`Tagged ${result.tagged} observations, ${result.summariesTagged} summaries`);
      fetchData();
    } catch {
      setBackfillStatus('Backfill failed');
    }
  };

  if (loading) {
    return <div className="pm-view" style={{ padding: '2rem', opacity: 0.5 }}>Loading...</div>;
  }

  if (!data) {
    return <div className="pm-view" style={{ padding: '2rem' }}>Failed to load PM data</div>;
  }

  const cards = [
    { label: 'Bugs', count: data.bugs, color: '#ef4444', view: 'pm-bugs' as ViewType },
    { label: 'Todos', count: data.todos, color: '#f59e0b', view: 'pm-todos' as ViewType },
    { label: 'Ideas', count: data.ideas, color: '#8b5cf6', view: 'pm-ideas' as ViewType },
    { label: 'Learnings', count: data.learnings, color: '#06b6d4', view: 'pm-learnings' as ViewType },
  ];

  return (
    <div className="pm-view" style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Project Management</h2>
          <ProjectFilter value={currentProject} onChange={onProjectChange} projects={codeProjects} />
        </div>
        <button
          onClick={handleBackfill}
          style={{
            background: 'none',
            border: '1px solid var(--border-color, #333)',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            color: 'var(--text-muted, #888)',
          }}
        >
          Backfill Tags
        </button>
      </div>

      {backfillStatus && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          background: 'var(--bg-secondary, #1a1a2e)',
          borderRadius: '6px',
          border: '1px solid var(--border-color, #333)',
        }}>
          {backfillStatus}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {cards.map(card => (
          <div
            key={card.label}
            onClick={() => onNavigate(card.view)}
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: `1px solid ${card.color}30`,
              background: `${card.color}08`,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = `${card.color}60`)}
            onMouseOut={e => (e.currentTarget.style.borderColor = `${card.color}30`)}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>{card.count}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Task Progress */}
      {(data.tasksOpen > 0 || data.tasksInProgress > 0) && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', opacity: 0.8 }}>Kanban Tasks</h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
            <span>{data.tasksOpen} open</span>
            <span>{data.tasksInProgress} in progress</span>
          </div>
        </div>
      )}

      {/* Recent Items */}
      {data.recent.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', opacity: 0.8 }}>Recent Tagged Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.recent.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #333)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ opacity: 0.4, fontSize: '0.7rem', minWidth: '24px' }}>#{item.id}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title || item.subtitle || '(untitled)'}
                </span>
                <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {item.tags.map(tag => (
                    <TagBadge key={tag} name={tag} color={TAG_COLORS[tag] || '#6366f1'} />
                  ))}
                </span>
                <span style={{ opacity: 0.4, fontSize: '0.7rem', flexShrink: 0 }}>
                  {formatTimeAgo(item.created_at_epoch)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
