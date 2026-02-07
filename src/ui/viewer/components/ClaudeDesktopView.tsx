import React, { useState, useEffect, useCallback } from 'react';

interface SdkSession {
  id: number;
  content_session_id: string;
  memory_session_id: string | null;
  project: string;
  user_prompt: string | null;
  started_at_epoch: number;
  completed_at_epoch: number | null;
  status: string;
  observation_count: number;
  summary_count: number;
}

interface ClaudeDesktopViewProps {
  projects: string[];
}

function formatTime(epoch: number): string {
  return new Date(epoch).toLocaleString();
}

function formatRelativeTime(epoch: number): string {
  const diff = Date.now() - epoch;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(epoch).toLocaleDateString();
}

function formatDuration(startEpoch: number, endEpoch: number | null): string {
  if (!endEpoch) return 'ongoing';
  const diff = endEpoch - startEpoch;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'cd-status-active',
  completed: 'cd-status-completed',
  failed: 'cd-status-failed',
};

export function ClaudeDesktopView({ projects }: ClaudeDesktopViewProps) {
  const [sessions, setSessions] = useState<SdkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedObs, setExpandedObs] = useState<any[]>([]);
  const [expandedSummary, setExpandedSummary] = useState<any | null>(null);

  const fetchSessions = useCallback(() => {
    const url = filterProject
      ? `/api/claude-desktop/sessions?project=${encodeURIComponent(filterProject)}`
      : '/api/claude-desktop/sessions';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterProject]);

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const toggleExpand = useCallback((session: SdkSession) => {
    if (expandedId === session.id) {
      setExpandedId(null);
      setExpandedObs([]);
      setExpandedSummary(null);
      return;
    }
    setExpandedId(session.id);
    setExpandedObs([]);
    setExpandedSummary(null);

    // Fetch observations for this session
    if (session.memory_session_id) {
      fetch(`/api/observations?project=${encodeURIComponent(session.project)}&limit=50`)
        .then(res => res.json())
        .then(data => {
          const obs = (data.observations || []).filter(
            (o: any) => o.memory_session_id === session.memory_session_id
          );
          setExpandedObs(obs);
        })
        .catch(() => {});

      fetch(`/api/summaries?project=${encodeURIComponent(session.project)}&limit=50`)
        .then(res => res.json())
        .then(data => {
          const sum = (data.summaries || []).find(
            (s: any) => s.session_id === session.memory_session_id
          );
          setExpandedSummary(sum || null);
        })
        .catch(() => {});
    }
  }, [expandedId]);

  if (loading) {
    return (
      <div className="cd-container">
        <div className="cd-header">
          <h2 className="cd-title">Claude Desktop</h2>
        </div>
        <div className="cd-sessions">
          {[1, 2, 3].map(i => (
            <div key={i} className="cd-session-card skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-subtitle" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cd-container">
      <div className="cd-header">
        <div className="cd-header-left">
          <h2 className="cd-title">Claude Desktop</h2>
          <span className="cd-subtitle">{sessions.length} sessions received</span>
        </div>
        <div className="cd-controls">
          <select
            className="cd-project-filter"
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className="cd-refresh-btn" onClick={fetchSessions} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="cd-empty">
          No sessions from Claude Desktop yet. Start a Claude Code session with UltraBrain hooks enabled.
        </div>
      ) : (
        <div className="cd-sessions">
          {sessions.map(session => (
            <div key={session.id} className="cd-session-card">
              <button
                className="cd-session-row"
                onClick={() => toggleExpand(session)}
              >
                <div className="cd-session-main">
                  <span className={`cd-status-dot ${STATUS_CLASSES[session.status] || ''}`} />
                  <div className="cd-session-info">
                    <div className="cd-session-prompt">
                      {session.user_prompt
                        ? (session.user_prompt.length > 120
                            ? session.user_prompt.slice(0, 120) + '...'
                            : session.user_prompt)
                        : 'Session #' + session.id}
                    </div>
                    <div className="cd-session-meta-row">
                      <span className="cd-project-badge">{session.project}</span>
                      <span className="cd-session-time">{formatRelativeTime(session.started_at_epoch)}</span>
                      <span className="cd-session-duration">
                        {formatDuration(session.started_at_epoch, session.completed_at_epoch)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="cd-session-counts">
                  <span className="cd-count-badge" title="Observations">{session.observation_count} obs</span>
                  <span className="cd-count-badge" title="Summaries">{session.summary_count} sum</span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`cd-expand-arrow ${expandedId === session.id ? 'expanded' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {expandedId === session.id && (
                <div className="cd-session-detail">
                  <div className="cd-detail-section">
                    <div className="cd-detail-label">Session ID</div>
                    <div className="cd-detail-value cd-monospace">{session.content_session_id}</div>
                  </div>

                  {session.memory_session_id && (
                    <div className="cd-detail-section">
                      <div className="cd-detail-label">Memory Session</div>
                      <div className="cd-detail-value cd-monospace">{session.memory_session_id}</div>
                    </div>
                  )}

                  <div className="cd-detail-section">
                    <div className="cd-detail-label">Started</div>
                    <div className="cd-detail-value">{formatTime(session.started_at_epoch)}</div>
                  </div>

                  {session.user_prompt && (
                    <div className="cd-detail-section">
                      <div className="cd-detail-label">User Prompt</div>
                      <div className="cd-detail-value cd-prompt-full">{session.user_prompt}</div>
                    </div>
                  )}

                  {expandedObs.length > 0 && (
                    <div className="cd-detail-section">
                      <div className="cd-detail-label">Observations ({expandedObs.length})</div>
                      <div className="cd-obs-list">
                        {expandedObs.map((obs: any) => (
                          <div key={obs.id} className="cd-obs-item">
                            <span className="cd-obs-type">{obs.type}</span>
                            <span className="cd-obs-title">{obs.title || obs.text?.slice(0, 80) || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedSummary && (
                    <div className="cd-detail-section">
                      <div className="cd-detail-label">Summary</div>
                      <div className="cd-summary-content">
                        {expandedSummary.request && (
                          <div className="cd-summary-field">
                            <span className="cd-summary-key">Request:</span> {expandedSummary.request}
                          </div>
                        )}
                        {expandedSummary.completed && (
                          <div className="cd-summary-field">
                            <span className="cd-summary-key">Completed:</span> {expandedSummary.completed}
                          </div>
                        )}
                        {expandedSummary.learned && (
                          <div className="cd-summary-field">
                            <span className="cd-summary-key">Learned:</span> {expandedSummary.learned}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
