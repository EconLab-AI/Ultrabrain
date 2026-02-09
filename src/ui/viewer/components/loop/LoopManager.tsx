import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectFilter } from '../shared/ProjectFilter';

interface LoopManagerProps {
  currentProject: string;
  projects: string[];
  onProjectChange: (project: string) => void;
}

interface LoopConfig {
  id: number;
  project: string;
  enabled: number;
  mode: string;
  max_iterations: number;
  task_description: string | null;
  success_criteria: string | null;
  completion_promises: string | null;
  promise_logic: string;
  iteration_context_tokens: number;
  auto_compact_threshold: number;
  created_at_epoch: number;
  updated_at_epoch: number;
}

interface LoopIteration {
  id: number;
  loop_config_id: number;
  iteration_number: number;
  session_id: string | null;
  mode_used: string | null;
  status: string;
  context_injected: string | null;
  observations_count: number;
  key_findings: string | null;
  started_at_epoch: number | null;
  completed_at_epoch: number | null;
}

interface LoopStatus {
  active: boolean;
  config: LoopConfig | null;
  iterations: LoopIteration[];
  currentIteration: LoopIteration | null;
  completedCount: number;
  totalIterations: number;
}

const PRESET_PROMISES = [
  'TASK_COMPLETE',
  'ALL_TESTS_PASS',
  'BUG_FIXED',
  'FEATURE_IMPLEMENTED',
  'REFACTORING_DONE',
  'DEPLOYMENT_READY',
];

const MODE_OPTIONS = [
  { value: 'adaptive', label: 'Adaptive', desc: 'Auto-selects mode per iteration' },
  { value: 'same-session', label: 'Same Session', desc: 'Continues in existing session' },
  { value: 'fresh', label: 'Fresh', desc: 'New session per iteration' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#64748b',
  running: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
};

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startEpoch: number, endEpoch: number | null): string {
  const end = endEpoch || Date.now();
  const diffMs = end - startEpoch;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function LoopManager({ currentProject, projects, onProjectChange }: LoopManagerProps) {
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'config' | 'current' | 'history'>('config');
  const [codeProjects, setCodeProjects] = useState<string[]>(projects);

  // Config form state
  const [taskDescription, setTaskDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [mode, setMode] = useState('adaptive');
  const [maxIterations, setMaxIterations] = useState(10);
  const [contextTokens, setContextTokens] = useState(500);
  const [autoCompactThreshold, setAutoCompactThreshold] = useState(0.8);
  const [promises, setPromises] = useState<string[]>([]);
  const [promiseLogic, setPromiseLogic] = useState<'any' | 'all'>('any');
  const [customPromise, setCustomPromise] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(() => {
    if (!currentProject) {
      setLoading(false);
      return;
    }
    const url = `/api/loop/status?project=${encodeURIComponent(currentProject)}`;
    fetch(url)
      .then(r => r.json())
      .then((data: LoopStatus) => {
        setStatus(data);
        // Populate form from existing config
        if (data.config) {
          setTaskDescription(data.config.task_description || '');
          setSuccessCriteria(data.config.success_criteria || '');
          setMode(data.config.mode);
          setMaxIterations(data.config.max_iterations);
          setContextTokens(data.config.iteration_context_tokens);
          setAutoCompactThreshold(data.config.auto_compact_threshold);
          setPromiseLogic(data.config.promise_logic as 'any' | 'all');
          try {
            const parsed = data.config.completion_promises
              ? JSON.parse(data.config.completion_promises)
              : [];
            setPromises(parsed);
          } catch { setPromises([]); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject]);

  // Fetch only Claude Code projects (exclude Claude Desktop)
  useEffect(() => {
    fetch('/api/projects/stats?source=claude-code')
      .then(r => r.json())
      .then(data => {
        if (data.projects) {
          setCodeProjects(data.projects.map((p: any) => p.name));
        }
      })
      .catch(() => setCodeProjects(projects));
  }, [projects]);

  useEffect(() => {
    setLoading(true);
    fetchStatus();
  }, [fetchStatus]);

  // Poll when active
  useEffect(() => {
    if (status?.active) {
      pollRef.current = setInterval(fetchStatus, 5000);
      setTab('current');
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status?.active, fetchStatus]);

  const handleStart = async () => {
    if (!taskDescription.trim()) return;
    await fetch('/api/loop/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: currentProject,
        task_description: taskDescription,
        success_criteria: successCriteria || undefined,
        mode,
        max_iterations: maxIterations,
        completion_promises: promises.length > 0 ? promises : undefined,
        promise_logic: promiseLogic,
        iteration_context_tokens: contextTokens,
        auto_compact_threshold: autoCompactThreshold,
      }),
    });
    fetchStatus();
    setTab('current');
  };

  const handleStop = async () => {
    await fetch(`/api/loop/stop?project=${encodeURIComponent(currentProject)}`, { method: 'POST' });
    fetchStatus();
  };

  const handleCancel = async () => {
    await fetch(`/api/loop/cancel?project=${encodeURIComponent(currentProject)}`, { method: 'POST' });
    fetchStatus();
  };

  const addPromise = (promise: string) => {
    if (promise && !promises.includes(promise)) {
      setPromises([...promises, promise]);
    }
    setCustomPromise('');
  };

  const removePromise = (promise: string) => {
    setPromises(promises.filter(p => p !== promise));
  };

  if (!currentProject) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 600 }}>UltraBrain Loop</h2>
        <div style={{ opacity: 0.5, fontSize: '0.85rem', marginBottom: '1rem' }}>Select a project to configure loops.</div>
        {codeProjects.length > 0 && <ProjectFilter value={currentProject} onChange={onProjectChange} projects={codeProjects} />}
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading loop status...</div>;
  }

  const isActive = status?.active ?? false;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      {/* Active Loop Banner */}
      {isActive && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.15))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8' }}>
              Loop Active
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>
              {status?.config?.task_description || 'Running...'} &mdash;
              Iteration {status?.completedCount ?? 0}/{status?.totalIterations ?? 0}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleStop}
              style={{
                padding: '4px 12px', fontSize: '0.75rem', borderRadius: '6px',
                border: '1px solid #f59e0b', background: 'transparent',
                color: '#f59e0b', cursor: 'pointer',
              }}
            >
              Stop
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '4px 12px', fontSize: '0.75rem', borderRadius: '6px',
                border: '1px solid #ef4444', background: 'transparent',
                color: '#ef4444', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>UltraBrain Loop</h2>
        <ProjectFilter value={currentProject} onChange={onProjectChange} projects={codeProjects} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem' }}>
        {(['config', 'current', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #333)',
              background: tab === t ? 'var(--accent-color, #6366f1)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted, #888)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t === 'config' ? 'Configuration' : t === 'current' ? 'Current Run' : 'History'}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {tab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Task Description */}
          <div>
            <label style={labelStyle}>Task Description *</label>
            <textarea
              value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
              placeholder="Describe the task for the loop to accomplish..."
              disabled={isActive}
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Success Criteria */}
          <div>
            <label style={labelStyle}>Success Criteria</label>
            <textarea
              value={successCriteria}
              onChange={e => setSuccessCriteria(e.target.value)}
              placeholder="Define what success looks like..."
              disabled={isActive}
              style={{
                ...inputStyle,
                minHeight: '60px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Mode Selector */}
          <div>
            <label style={labelStyle}>Mode</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  disabled={isActive}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: `1px solid ${mode === opt.value ? '#6366f1' : 'var(--border-color, #333)'}`,
                    background: mode === opt.value ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: mode === opt.value ? '#818cf8' : 'var(--text-muted, #888)',
                    cursor: isActive ? 'not-allowed' : 'pointer',
                    flex: 1,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '2px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Iterations Slider */}
          <div>
            <label style={labelStyle}>Max Iterations: {maxIterations}</label>
            <input
              type="range"
              min={1}
              max={50}
              value={maxIterations}
              onChange={e => setMaxIterations(parseInt(e.target.value, 10))}
              disabled={isActive}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.4 }}>
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Context Tokens */}
          <div>
            <label style={labelStyle}>Iteration Context Tokens: {contextTokens}</label>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={contextTokens}
              onChange={e => setContextTokens(parseInt(e.target.value, 10))}
              disabled={isActive}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.4 }}>
              <span>100</span>
              <span>2000</span>
            </div>
          </div>

          {/* Auto-Compact Threshold */}
          <div>
            <label style={labelStyle}>Auto-Compact Threshold: {(autoCompactThreshold * 100).toFixed(0)}%</label>
            <input
              type="range"
              min={0.5}
              max={1.0}
              step={0.05}
              value={autoCompactThreshold}
              onChange={e => setAutoCompactThreshold(parseFloat(e.target.value))}
              disabled={isActive}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.4 }}>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Completion Promises */}
          <div>
            <label style={labelStyle}>Completion Promises</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Logic:</span>
              <button
                onClick={() => setPromiseLogic('any')}
                disabled={isActive}
                style={{
                  padding: '2px 10px', fontSize: '0.7rem', borderRadius: '4px',
                  border: `1px solid ${promiseLogic === 'any' ? '#10b981' : 'var(--border-color, #333)'}`,
                  background: promiseLogic === 'any' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: promiseLogic === 'any' ? '#10b981' : 'var(--text-muted, #888)',
                  cursor: isActive ? 'not-allowed' : 'pointer',
                }}
              >
                ANY
              </button>
              <button
                onClick={() => setPromiseLogic('all')}
                disabled={isActive}
                style={{
                  padding: '2px 10px', fontSize: '0.7rem', borderRadius: '4px',
                  border: `1px solid ${promiseLogic === 'all' ? '#3b82f6' : 'var(--border-color, #333)'}`,
                  background: promiseLogic === 'all' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: promiseLogic === 'all' ? '#3b82f6' : 'var(--text-muted, #888)',
                  cursor: isActive ? 'not-allowed' : 'pointer',
                }}
              >
                ALL
              </button>
            </div>

            {/* Active promises */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {promises.map(p => (
                <span
                  key={p}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', fontSize: '0.7rem', borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#818cf8',
                  }}
                >
                  {p}
                  {!isActive && (
                    <span
                      onClick={() => removePromise(p)}
                      style={{ cursor: 'pointer', opacity: 0.6, fontSize: '0.8rem' }}
                    >
                      x
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Preset dropdown + custom input */}
            {!isActive && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  onChange={e => { if (e.target.value) addPromise(e.target.value); e.target.value = ''; }}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    padding: '6px 8px',
                  }}
                >
                  <option value="">Add preset...</option>
                  {PRESET_PROMISES.filter(p => !promises.includes(p)).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  value={customPromise}
                  onChange={e => setCustomPromise(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customPromise.trim()) { addPromise(customPromise.trim().toUpperCase()); } }}
                  placeholder="Custom promise..."
                  style={{ ...inputStyle, flex: 1, padding: '6px 8px' }}
                />
                <button
                  onClick={() => { if (customPromise.trim()) addPromise(customPromise.trim().toUpperCase()); }}
                  disabled={!customPromise.trim()}
                  style={{
                    padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px',
                    border: '1px solid var(--border-color, #333)',
                    background: 'transparent', color: 'var(--text-muted, #888)',
                    cursor: customPromise.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Start Button */}
          {!isActive && (
            <button
              onClick={handleStart}
              disabled={!taskDescription.trim()}
              style={{
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: taskDescription.trim()
                  ? 'linear-gradient(135deg, #6366f1, #3b82f6)'
                  : 'var(--border-color, #333)',
                color: taskDescription.trim() ? '#fff' : 'var(--text-muted, #888)',
                cursor: taskDescription.trim() ? 'pointer' : 'not-allowed',
                marginTop: '0.5rem',
              }}
            >
              Start Loop
            </button>
          )}
        </div>
      )}

      {/* Current Run Tab */}
      {tab === 'current' && (
        <div>
          {!status?.config ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
              No loop configured yet. Go to Configuration to set one up.
            </div>
          ) : (
            <>
              {/* Task summary */}
              <div style={{
                padding: '12px 16px', borderRadius: '8px',
                border: '1px solid var(--border-color, #333)',
                marginBottom: '1rem',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  {status.config.task_description || 'No task description'}
                </div>
                {status.config.success_criteria && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>
                    Criteria: {status.config.success_criteria}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '6px' }}>
                  Mode: {status.config.mode} | Max: {status.config.max_iterations} iterations
                </div>
              </div>

              {/* Progress bar */}
              {status.iterations.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.7rem', opacity: 0.5, marginBottom: '4px',
                  }}>
                    <span>Progress</span>
                    <span>{status.completedCount}/{status.totalIterations}</span>
                  </div>
                  <div style={{
                    height: '6px', borderRadius: '3px',
                    background: 'var(--border-color, #333)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                      width: `${Math.min(100, (status.completedCount / status.totalIterations) * 100)}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Iteration cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {status.iterations.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
                    No iterations yet.
                  </div>
                ) : (
                  status.iterations.map(iter => (
                    <div key={iter.id} style={{
                      padding: '10px 14px', borderRadius: '8px',
                      border: `1px solid ${iter.status === 'running' ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-color, #333)'}`,
                      background: iter.status === 'running' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: STATUS_COLORS[iter.status] || '#64748b',
                          flexShrink: 0,
                          animation: iter.status === 'running' ? 'pulse 2s infinite' : 'none',
                        }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Iteration {iter.iteration_number}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', padding: '1px 8px', borderRadius: '4px',
                          background: `${STATUS_COLORS[iter.status]}20`,
                          color: STATUS_COLORS[iter.status],
                          textTransform: 'uppercase',
                        }}>
                          {iter.status}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.4 }}>
                          {iter.mode_used || '-'}
                        </span>
                      </div>

                      {iter.key_findings && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                          {iter.key_findings}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.65rem', opacity: 0.4 }}>
                        {iter.observations_count > 0 && (
                          <span>{iter.observations_count} observations</span>
                        )}
                        {iter.started_at_epoch && (
                          <span>{formatDuration(iter.started_at_epoch, iter.completed_at_epoch)}</span>
                        )}
                        {iter.started_at_epoch && (
                          <span>{formatDate(iter.started_at_epoch)}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <LoopHistory currentProject={currentProject} />
      )}
    </div>
  );
}

// ─── History Sub-Component ──────────────────────────────────────

function LoopHistory({ currentProject }: { currentProject: string }) {
  const [iterations, setIterations] = useState<LoopIteration[]>([]);
  const [config, setConfig] = useState<LoopConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    fetch(`/api/loop/history?project=${encodeURIComponent(currentProject)}`)
      .then(r => r.json())
      .then(data => {
        setConfig(data.config || null);
        setIterations(data.iterations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentProject]);

  if (loading) {
    return <div style={{ padding: '1rem', opacity: 0.5, fontSize: '0.85rem' }}>Loading history...</div>;
  }

  if (!config || iterations.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
        No loop history for this project.
      </div>
    );
  }

  const completed = iterations.filter(i => i.status === 'completed').length;
  const failed = iterations.filter(i => i.status === 'failed').length;

  return (
    <div>
      {/* Summary */}
      <div style={{
        padding: '12px 16px', borderRadius: '8px',
        border: '1px solid var(--border-color, #333)',
        marginBottom: '1rem',
        display: 'flex', gap: '1.5rem',
      }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{iterations.length}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Total Iterations</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{completed}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Completed</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>{failed}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Failed</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#818cf8' }}>{config.mode}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>Mode</div>
        </div>
      </div>

      {/* Past iterations list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {iterations.map(iter => (
          <div key={iter.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: '6px',
            border: '1px solid var(--border-color, #333)',
            fontSize: '0.8rem',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: STATUS_COLORS[iter.status] || '#64748b',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, width: '50px' }}>#{iter.iteration_number}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
              {iter.key_findings || 'No findings'}
            </span>
            {iter.observations_count > 0 && (
              <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>{iter.observations_count} obs</span>
            )}
            <span style={{
              fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px',
              background: `${STATUS_COLORS[iter.status]}20`,
              color: STATUS_COLORS[iter.status],
            }}>
              {iter.status}
            </span>
            {iter.started_at_epoch && (
              <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>{formatDate(iter.started_at_epoch)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Styles ──────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginBottom: '4px',
  opacity: 0.7,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '0.8rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color, #333)',
  background: 'var(--input-bg, #1a1a2e)',
  color: 'inherit',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
