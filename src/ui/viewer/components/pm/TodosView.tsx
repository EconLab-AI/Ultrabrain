import React, { useState, useEffect } from 'react';
import { TagBadge } from '../shared/TagBadge';
import { SearchFilter } from '../shared/SearchFilter';

interface TodosViewProps {
  currentProject: string;
}

interface TodoObservation {
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

interface Task {
  id: number;
  project: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  created_at_epoch: number;
}

const TAG_COLORS: Record<string, string> = {
  todo: '#f59e0b', bug: '#ef4444', feature: '#10b981', 'planned-feature': '#f59e0b',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#64748b',
};

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TodosView({ currentProject }: TodosViewProps) {
  const [observations, setObservations] = useState<TodoObservation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'observations' | 'tasks'>('all');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentProject) params.set('project', currentProject);
    if (showResolved) params.set('status', 'all');
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/pm/todos${qs}`)
      .then(r => r.json())
      .then(data => {
        setObservations(data.observations || []);
        setTasks(data.tasks || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject, showResolved]);

  const handleTaskStatusToggle = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const filteredObs = search
    ? observations.filter(o =>
        (o.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.subtitle || '').toLowerCase().includes(search.toLowerCase()))
    : observations;

  const filteredTasks = search
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase()))
    : tasks;

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading todos...</div>;
  }

  const activeTasks = filteredTasks.filter(t => t.status !== 'done');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Todos
          <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '8px' }}>
            ({filteredObs.length} tagged + {filteredTasks.length} tasks)
          </span>
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.6, cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      <SearchFilter value={search} onChange={setSearch} placeholder="Search todos..." />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
        {(['all', 'observations', 'tasks'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #333)',
              background: tab === t ? 'var(--accent-color, #6366f1)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted, #888)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tagged Observations */}
      {(tab === 'all' || tab === 'observations') && filteredObs.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {tab === 'all' && <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: '8px' }}>From Observations</h3>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredObs.map(obs => {
              const isResolved = obs.status === 'resolved' || obs.status === 'archived' || obs.status === 'stale';
              return (
              <div key={obs.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '6px',
                border: '1px solid var(--border-color, #333)', fontSize: '0.8rem',
                opacity: isResolved ? 0.45 : 1,
              }}>
                <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>#{obs.id}</span>
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: isResolved ? 'line-through' : 'none',
                }}>
                  {obs.title || obs.subtitle || '(untitled)'}
                </span>
                {isResolved && (
                  <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: '#374151', color: '#9ca3af' }}>
                    {obs.status}
                  </span>
                )}
                <span style={{ display: 'flex', gap: '4px' }}>
                  {obs.tags.map(tag => (
                    <TagBadge key={tag} name={tag} color={TAG_COLORS[tag] || '#6366f1'} />
                  ))}
                </span>
                <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{formatDate(obs.created_at_epoch)}</span>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Tasks */}
      {(tab === 'all' || tab === 'tasks') && (
        <div>
          {tab === 'all' && <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: '8px' }}>Kanban Tasks</h3>}

          {activeTasks.length === 0 && doneTasks.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>No tasks yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeTasks.map(task => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid var(--border-color, #333)', fontSize: '0.8rem',
                }}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleTaskStatusToggle(task)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: PRIORITY_COLORS[task.priority] || '#64748b',
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1 }}>{task.title}</span>
                  <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>{task.status}</span>
                </div>
              ))}

              {doneTasks.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '8px' }}>Completed ({doneTasks.length})</div>
                  {doneTasks.slice(0, 5).map(task => (
                    <div key={task.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: '6px',
                      border: '1px solid var(--border-color, #333)', fontSize: '0.8rem',
                      opacity: 0.5,
                    }}>
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleTaskStatusToggle(task)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, textDecoration: 'line-through' }}>{task.title}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
