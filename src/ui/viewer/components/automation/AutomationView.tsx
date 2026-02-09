import React, { useState, useEffect, useCallback } from 'react';
import { AutomationJobForm } from './AutomationJobForm';
import { AutomationRunHistory } from './AutomationRunHistory';

interface AutomationJob {
  id: number;
  name: string;
  type: string;
  project: string;
  enabled: number;
  cron_expression: string | null;
  timezone: string;
  webhook_path: string | null;
  webhook_secret: string | null;
  trigger_event: string | null;
  trigger_conditions: string | null;
  task_description: string;
  working_directory: string | null;
  model: string;
  permission_mode: string;
  max_runtime_seconds: number;
  last_run_at_epoch: number | null;
  next_run_at_epoch: number | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_at_epoch: number;
  updated_at_epoch: number;
}

interface AutomationRun {
  id: number;
  job_id: number;
  status: string;
  triggered_by: string;
  trigger_payload: string | null;
  output_log: string | null;
  error_message: string | null;
  observations_created: number;
  started_at_epoch: number;
  completed_at_epoch: number | null;
  duration_ms: number | null;
  retry_number: number;
}

interface AutomationViewProps {
  currentProject: string;
}

const typeColors: Record<string, { bg: string; text: string }> = {
  cron: { bg: '#3b82f633', text: '#3b82f6' },
  webhook: { bg: '#10b98133', text: '#10b981' },
  trigger: { bg: '#f59e0b33', text: '#f59e0b' },
  'one-time': { bg: '#8b5cf633', text: '#8b5cf6' },
};

function formatTime(epoch: number | null): string {
  if (!epoch) return '-';
  return new Date(epoch).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AutomationView({ currentProject }: AutomationViewProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'history'>('jobs');
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<AutomationJob | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchJobs = useCallback(() => {
    const params = currentProject ? `?project=${encodeURIComponent(currentProject)}` : '';
    fetch(`/api/automation/jobs${params}`)
      .then(r => r.json())
      .then(data => setJobs(data.jobs || []))
      .catch(() => {});
  }, [currentProject]);

  const fetchRuns = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/automation/runs${qs}`)
      .then(r => r.json())
      .then(data => setRuns(data.runs || []))
      .catch(() => {});
  }, [statusFilter]);

  const fetchProjects = useCallback(() => {
    fetch('/api/data/projects')
      .then(r => r.json())
      .then(data => setProjects(data.projects?.map((p: any) => p.project || p) || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchJobs(), fetchRuns(), fetchProjects()])
      .finally(() => setLoading(false));
  }, [fetchJobs, fetchRuns, fetchProjects]);

  useEffect(() => {
    fetchRuns();
  }, [statusFilter, fetchRuns]);

  const handleSaveJob = async (data: any) => {
    const url = editingJob
      ? `/api/automation/jobs/${editingJob.id}`
      : '/api/automation/jobs';
    const method = editingJob ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingJob(null);
        fetchJobs();
      }
    } catch {
      // Error handled silently
    }
  };

  const handleDeleteJob = async (id: number) => {
    try {
      await fetch(`/api/automation/jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch {
      // Error handled silently
    }
  };

  const handleToggleJob = async (id: number, enabled: boolean) => {
    const endpoint = enabled ? 'disable' : 'enable';
    try {
      await fetch(`/api/automation/jobs/${id}/${endpoint}`, { method: 'POST' });
      fetchJobs();
    } catch {
      // Error handled silently
    }
  };

  const handleRunNow = async (id: number) => {
    try {
      await fetch(`/api/automation/jobs/${id}/run`, { method: 'POST' });
      fetchRuns();
    } catch {
      // Error handled silently
    }
  };

  const jobNames = jobs.reduce<Record<number, string>>((acc, j) => {
    acc[j.id] = j.name;
    return acc;
  }, {});

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading automation...</div>;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 600 }}>
        Automation
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid var(--border-color, #333)' }}>
        {(['jobs', 'history'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab ? 600 : 400,
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-color, #6366f1)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab ? 'var(--text-color, #e0e0e0)' : 'var(--text-secondary, #888)',
              cursor: 'pointer',
            }}
          >
            {tab === 'jobs' ? 'Jobs' : 'Run History'}
          </button>
        ))}
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div>
          {showForm || editingJob ? (
            <AutomationJobForm
              job={editingJob}
              onSave={handleSaveJob}
              onCancel={() => { setShowForm(false); setEditingJob(null); }}
              projects={projects}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent-color, #6366f1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                + Create New Job
              </button>

              {jobs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                  No automation jobs configured yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {jobs.map(job => {
                    const colors = typeColors[job.type] || typeColors['one-time'];
                    return (
                      <div
                        key={job.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #333)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        {/* Enable/Disable toggle */}
                        <div
                          onClick={() => handleToggleJob(job.id, !!job.enabled)}
                          style={{
                            width: '36px',
                            height: '20px',
                            borderRadius: '10px',
                            background: job.enabled ? '#10b981' : 'var(--border-color, #444)',
                            cursor: 'pointer',
                            position: 'relative',
                            flexShrink: 0,
                            transition: 'background 0.2s',
                          }}
                        >
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: '2px',
                            left: job.enabled ? '18px' : '2px',
                            transition: 'left 0.2s',
                          }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.name}</span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: colors.bg,
                              color: colors.text,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}>
                              {job.type}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', display: 'flex', gap: '16px' }}>
                            <span>Runs: {job.total_runs} ({job.successful_runs} ok / {job.failed_runs} fail)</span>
                            <span>Last: {formatTime(job.last_run_at_epoch)}</span>
                            {job.cron_expression && <span>Cron: {job.cron_expression}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleRunNow(job.id)}
                            title="Run Now"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #333)',
                              background: 'transparent',
                              color: '#10b981',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Run
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingJob(job)}
                            title="Edit"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #333)',
                              background: 'transparent',
                              color: 'var(--text-color, #e0e0e0)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            title="Delete"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #333)',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <AutomationRunHistory
          runs={runs}
          jobNames={jobNames}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      )}
    </div>
  );
}
