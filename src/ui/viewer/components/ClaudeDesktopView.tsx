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
  prompt_count: number;
}

interface UserPrompt {
  id: number;
  content_session_id: string;
  prompt_number: number;
  prompt_text: string;
  created_at: string;
  created_at_epoch: number;
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
  const [expandedPrompts, setExpandedPrompts] = useState<UserPrompt[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

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
      setExpandedPrompts([]);
      return;
    }
    setExpandedId(session.id);
    setExpandedPrompts([]);

    // Fetch conversation prompts for this session
    fetch(`/api/claude-desktop/sessions/${encodeURIComponent(session.content_session_id)}/prompts`)
      .then(res => res.json())
      .then(data => {
        setExpandedPrompts(data.prompts || []);
      })
      .catch(() => {});
  }, [expandedId]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/claude-desktop/import', { method: 'POST' });
      const data = await res.json();
      setImportResult(`Imported ${data.sessionsImported || 0} sessions, ${data.promptsImported || 0} prompts`);
      fetchSessions();
    } catch {
      setImportResult('Import failed');
    } finally {
      setImporting(false);
    }
  }, [fetchSessions]);

  // Get unique projects from Claude Desktop sessions for filtering
  const cdProjects = [...new Set(sessions.map(s => s.project))].sort();

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
            {cdProjects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            className="cd-refresh-btn"
            onClick={handleImport}
            disabled={importing}
            title="Re-import from Claude Desktop"
            style={{ opacity: importing ? 0.5 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button className="cd-refresh-btn" onClick={fetchSessions} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {importResult && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '0.8rem',
          background: 'var(--bg-secondary, #1a1a2e)',
          borderRadius: '6px',
          border: '1px solid var(--border-color, #333)',
        }}>
          {importResult}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="cd-empty">
          <div>No Claude Desktop sessions imported yet.</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '8px' }}>
            Claude Desktop stores conversations on Anthropic's servers. Local agent mode sessions (if available) can be imported automatically.
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              marginTop: '12px',
              padding: '6px 16px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #333)',
              background: 'var(--accent-color, #6366f1)',
              color: '#fff',
              cursor: importing ? 'wait' : 'pointer',
              opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? 'Importing...' : 'Import Now'}
          </button>
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
                  <span className="cd-count-badge" title="Conversation messages">
                    {session.prompt_count || 0} prompts
                  </span>
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

                  {expandedPrompts.length > 0 && (
                    <div className="cd-detail-section">
                      <div className="cd-detail-label">Conversation ({expandedPrompts.length} messages)</div>
                      <div className="cd-obs-list">
                        {expandedPrompts.map((prompt) => (
                          <div key={prompt.id} className="cd-obs-item">
                            <span className="cd-obs-type">#{prompt.prompt_number}</span>
                            <span className="cd-obs-title">
                              {prompt.prompt_text.length > 200
                                ? prompt.prompt_text.slice(0, 200) + '...'
                                : prompt.prompt_text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedPrompts.length === 0 && expandedId === session.id && (
                    <div className="cd-detail-section">
                      <div className="cd-detail-label">Conversation</div>
                      <div className="cd-detail-value" style={{ opacity: 0.5 }}>
                        No conversation messages imported yet. Try re-importing.
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
