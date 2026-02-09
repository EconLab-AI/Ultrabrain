import React, { useState } from 'react';

interface AutomationRun {
  id: number;
  job_id: number;
  job_name?: string;
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

interface AutomationRunHistoryProps {
  runs: AutomationRun[];
  jobNames: Record<number, string>;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fbbf2433', text: '#fbbf24' },
  running: { bg: '#3b82f633', text: '#3b82f6' },
  completed: { bg: '#10b98133', text: '#10b981' },
  failed: { bg: '#ef444433', text: '#ef4444' },
};

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTime(epoch: number): string {
  return new Date(epoch).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AutomationRunHistory({ runs, jobNames, statusFilter, onStatusFilterChange }: AutomationRunHistoryProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = statusFilter
    ? runs.filter(r => r.status === statusFilter)
    : runs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #888)' }}>Filter:</span>
        {['', 'pending', 'running', 'completed', 'failed'].map(status => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(status)}
            style={{
              padding: '3px 10px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: statusFilter === status
                ? '1px solid var(--accent-color, #6366f1)'
                : '1px solid var(--border-color, #333)',
              background: statusFilter === status ? 'var(--accent-color, #6366f1)' : 'transparent',
              color: statusFilter === status ? '#fff' : 'var(--text-color, #e0e0e0)',
              cursor: 'pointer',
            }}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
          No runs found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 0.7fr 0.8fr 1fr 0.8fr 0.6fr',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-secondary, #888)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span>Job</span>
            <span>Status</span>
            <span>Trigger</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Obs.</span>
          </div>

          {/* Rows */}
          {filtered.map(run => {
            const colors = statusColors[run.status] || statusColors.pending;
            const isExpanded = expandedId === run.id;

            return (
              <div key={run.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 0.7fr 0.8fr 1fr 0.8fr 0.6fr',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #333)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    alignItems: 'center',
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {jobNames[run.job_id] || `Job #${run.job_id}`}
                  </span>

                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    {run.status}
                  </span>

                  <span style={{ color: 'var(--text-secondary, #888)' }}>
                    {run.triggered_by}
                  </span>

                  <span style={{ color: 'var(--text-secondary, #888)' }}>
                    {formatTime(run.started_at_epoch)}
                  </span>

                  <span>{formatDuration(run.duration_ms)}</span>

                  <span>{run.observations_created}</span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{
                    padding: '12px 16px',
                    margin: '4px 0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #333)',
                    background: 'var(--card-bg, #16162a)',
                    fontSize: '0.8rem',
                  }}>
                    {run.error_message && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Error</div>
                        <div style={{
                          padding: '8px',
                          borderRadius: '4px',
                          background: '#ef444411',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                        }}>
                          {run.error_message}
                        </div>
                      </div>
                    )}

                    {run.output_log && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary, #888)' }}>Output Log</div>
                        <div style={{
                          padding: '8px',
                          borderRadius: '4px',
                          background: 'var(--code-bg, #0d0d1a)',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '200px',
                          overflow: 'auto',
                        }}>
                          {run.output_log}
                        </div>
                      </div>
                    )}

                    {!run.error_message && !run.output_log && (
                      <div style={{ color: 'var(--text-secondary, #888)', fontStyle: 'italic' }}>
                        No output recorded.
                      </div>
                    )}
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
