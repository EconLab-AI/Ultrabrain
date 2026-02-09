import React, { useState, useEffect } from 'react';

interface CurrentStateViewProps {
  currentProject: string;
}

interface SessionInfo {
  id: number;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  status: string;
  messageCount: number;
}

interface Observation {
  id: number;
  type: string;
  title: string | null;
  subtitle: string | null;
  created_at_epoch: number;
}

interface Decision {
  id: number;
  title: string;
  created_at_epoch: number;
}

interface CurrentStateData {
  lastSession: SessionInfo | null;
  recentObservations: Observation[];
  openTasks: { todo: number; in_progress: number; done: number };
  recentDecisions: Decision[];
  tagCounts: Record<string, number>;
  filesChanged: string[];
  error?: string;
}

function formatTimeAgo(epoch: number): string {
  const diff = Date.now() - epoch;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const TAG_COLORS: Record<string, string> = {
  bug: '#ef4444',
  fix: '#f97316',
  todo: '#f59e0b',
  feature: '#10b981',
  idea: '#3b82f6',
  learning: '#8b5cf6',
  decision: '#6366f1',
  refactor: '#ec4899',
  security: '#dc2626',
  performance: '#14b8a6',
  'planned-feature': '#f59e0b',
};

export function CurrentStateView({ currentProject }: CurrentStateViewProps) {
  const [data, setData] = useState<CurrentStateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/current-state?project=${encodeURIComponent(currentProject)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 600 }}>Current State</h2>
        <div style={{ opacity: 0.5, fontSize: '0.85rem', marginBottom: '1rem' }}>Select a project from the Overview to view its current state.</div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading current state...</div>;
  }

  if (!data || data.error) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>No data available.</div>;
  }

  const openTasks = data.openTasks || { todo: 0, in_progress: 0, done: 0 };
  const totalTasks = openTasks.todo + openTasks.in_progress + openTasks.done;
  const recentObservations = data.recentObservations || [];
  const recentDecisions = data.recentDecisions || [];
  const tagCounts = data.tagCounts || {};
  const filesChanged = data.filesChanged || [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '960px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Current State</h2>
      </div>

      {/* Top row: 2 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Last Session Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
            Last Session
          </div>
          {data.lastSession ? (
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
                {formatDuration(data.lastSession.duration)}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>
                {formatTimeAgo(data.lastSession.startTime)}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                {data.lastSession.messageCount} observation{data.lastSession.messageCount !== 1 ? 's' : ''}
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 500,
                background: data.lastSession.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: data.lastSession.status === 'completed' ? '#10b981' : '#f59e0b',
              }}>
                {data.lastSession.status}
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>No sessions yet</div>
          )}
        </div>

        {/* Active Work Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
            Active Work
          </div>
          {totalTasks > 0 ? (
            <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b' }}>{openTasks.todo}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Todo</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3b82f6' }}>{openTasks.in_progress}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>In Progress</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{openTasks.done}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Done</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalTasks > 0 ? (openTasks.done / totalTasks) * 100 : 0}%`,
                  background: '#10b981',
                  borderRadius: '2px',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>No tasks yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity - full width */}
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #333)',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
          Recent Activity
        </div>
        {recentObservations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentObservations.map(obs => (
              <div key={obs.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#6366f1', flexShrink: 0,
                }} />
                <span style={{ opacity: 0.4, fontSize: '0.7rem', minWidth: '28px' }}>#{obs.id}</span>
                <span style={{
                  padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem',
                  background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', minWidth: '50px', textAlign: 'center',
                }}>
                  {obs.type}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obs.title || obs.subtitle || '(untitled)'}
                </span>
                <span style={{ opacity: 0.4, fontSize: '0.7rem', flexShrink: 0 }}>
                  {formatTimeAgo(obs.created_at_epoch)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>No recent activity</div>
        )}
      </div>

      {/* Bottom row: 2 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Decisions Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
            Recent Decisions
          </div>
          {recentDecisions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentDecisions.map(d => (
                <div key={d.id} style={{ fontSize: '0.82rem' }}>
                  <div style={{ marginBottom: '2px' }}>{d.title}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{formatTimeAgo(d.created_at_epoch)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>No decisions recorded</div>
          )}
        </div>

        {/* Tags Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
            Tag Distribution
          </div>
          {Object.keys(tagCounts).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem',
                    background: `${TAG_COLORS[tag] || '#6366f1'}20`,
                    color: TAG_COLORS[tag] || '#6366f1',
                  }}>
                    {tag}
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </span>
                ))}
            </div>
          ) : (
            <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>No tags yet</div>
          )}
        </div>
      </div>

      {/* Files Changed */}
      {filesChanged.length > 0 && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
          marginTop: '12px',
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
            Recently Changed Files
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filesChanged.map((file, i) => (
              <div key={i} style={{ fontSize: '0.78rem', fontFamily: 'monospace', opacity: 0.7 }}>
                {file}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
