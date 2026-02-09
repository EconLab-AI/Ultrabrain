import React, { useState, useEffect } from 'react';
import { CronExpressionInput } from './CronExpressionInput';

interface AutomationJobFormProps {
  job?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  projects: string[];
}

const JOB_TYPES = [
  { value: 'cron', label: 'Cron Schedule' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'trigger', label: 'Event Trigger' },
  { value: 'one-time', label: 'One-Time' },
];

const MODELS = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-color, #333)',
  background: 'var(--input-bg, #1a1a2e)',
  color: 'var(--text-color, #e0e0e0)',
  fontSize: '0.85rem',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '4px',
  color: 'var(--text-color, #e0e0e0)',
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '16px',
};

export function AutomationJobForm({ job, onSave, onCancel, projects }: AutomationJobFormProps) {
  const [name, setName] = useState(job?.name || '');
  const [type, setType] = useState(job?.type || 'cron');
  const [project, setProject] = useState(job?.project || projects[0] || '');
  const [cronExpression, setCronExpression] = useState(job?.cron_expression || '0 * * * *');
  const [timezone, setTimezone] = useState(job?.timezone || 'UTC');
  const [triggerEvent, setTriggerEvent] = useState(job?.trigger_event || '');
  const [triggerConditions, setTriggerConditions] = useState(
    job?.trigger_conditions ? (typeof job.trigger_conditions === 'string' ? job.trigger_conditions : JSON.stringify(job.trigger_conditions, null, 2)) : '{}'
  );
  const [taskDescription, setTaskDescription] = useState(job?.task_description || '');
  const [model, setModel] = useState(job?.model || 'sonnet');
  const [maxRuntime, setMaxRuntime] = useState(job?.max_runtime_seconds || 3600);
  const [workingDirectory, setWorkingDirectory] = useState(job?.working_directory || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let parsedConditions = undefined;
    if (type === 'trigger' && triggerConditions) {
      try {
        parsedConditions = JSON.parse(triggerConditions);
      } catch {
        // Leave as string, backend will handle
        parsedConditions = triggerConditions;
      }
    }

    onSave({
      name,
      type,
      project,
      cron_expression: type === 'cron' ? cronExpression : undefined,
      timezone: type === 'cron' ? timezone : undefined,
      trigger_event: type === 'trigger' ? triggerEvent : undefined,
      trigger_conditions: type === 'trigger' ? parsedConditions : undefined,
      task_description: taskDescription,
      model,
      max_runtime_seconds: maxRuntime,
      working_directory: workingDirectory || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid var(--border-color, #333)',
      background: 'var(--card-bg, #16162a)',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 600 }}>
        {job ? 'Edit Job' : 'Create Automation Job'}
      </h3>

      {/* Name */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Job Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Nightly test suite"
          required
          style={inputStyle}
        />
      </div>

      {/* Type */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {JOB_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: type === t.value
                  ? '1px solid var(--accent-color, #6366f1)'
                  : '1px solid var(--border-color, #333)',
                background: type === t.value ? 'var(--accent-color, #6366f1)' : 'transparent',
                color: type === t.value ? '#fff' : 'var(--text-color, #e0e0e0)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: Cron */}
      {type === 'cron' && (
        <>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Cron Expression</label>
            <CronExpressionInput value={cronExpression} onChange={setCronExpression} />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={inputStyle}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Conditional: Webhook */}
      {type === 'webhook' && job?.webhook_path && (
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Webhook URL</label>
          <div style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            wordBreak: 'break-all',
            background: 'var(--code-bg, #0d0d1a)',
          }}>
            {`${window.location.origin}/api/webhooks/${job.webhook_path}`}
          </div>
          {job.webhook_secret && (
            <>
              <label style={{ ...labelStyle, marginTop: '8px' }}>Webhook Secret</label>
              <div style={{
                ...inputStyle,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
                background: 'var(--code-bg, #0d0d1a)',
              }}>
                {job.webhook_secret}
              </div>
            </>
          )}
        </div>
      )}
      {type === 'webhook' && !job && (
        <div style={{
          ...fieldGroupStyle,
          padding: '12px',
          background: 'var(--info-bg, #1a1a3e)',
          borderRadius: '6px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary, #888)',
        }}>
          Webhook URL and secret will be auto-generated after creation.
        </div>
      )}

      {/* Conditional: Trigger */}
      {type === 'trigger' && (
        <>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Event Type</label>
            <select value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)} style={inputStyle}>
              <option value="">Select event type...</option>
              <option value="observation_created">Observation Created</option>
              <option value="session_completed">Session Completed</option>
              <option value="tag_added">Tag Added</option>
              <option value="bug_detected">Bug Detected</option>
            </select>
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Conditions (JSON)</label>
            <textarea
              value={triggerConditions}
              onChange={e => setTriggerConditions(e.target.value)}
              rows={4}
              placeholder='{"event_type": "observation_created", "has_tag": "bug"}'
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
            />
          </div>
        </>
      )}

      {/* Task Description */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Task Description (Claude Prompt)</label>
        <textarea
          value={taskDescription}
          onChange={e => setTaskDescription(e.target.value)}
          rows={5}
          required
          placeholder="Describe what Claude should do when this automation runs..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Project */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Project</label>
        {projects.length > 0 ? (
          <select value={project} onChange={e => setProject(e.target.value)} style={inputStyle}>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={project}
            onChange={e => setProject(e.target.value)}
            placeholder="Project name"
            required
            style={inputStyle}
          />
        )}
      </div>

      {/* Model */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ ...fieldGroupStyle, flex: 1 }}>
          <label style={labelStyle}>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle}>
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div style={{ ...fieldGroupStyle, flex: 1 }}>
          <label style={labelStyle}>Max Runtime (seconds)</label>
          <input
            type="number"
            value={maxRuntime}
            onChange={e => setMaxRuntime(parseInt(e.target.value, 10) || 3600)}
            min={60}
            max={86400}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Working Directory (optional) */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Working Directory (optional)</label>
        <input
          type="text"
          value={workingDirectory}
          onChange={e => setWorkingDirectory(e.target.value)}
          placeholder="Auto-detected from project if empty"
          style={inputStyle}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #333)',
            background: 'transparent',
            color: 'var(--text-color, #e0e0e0)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: 'var(--accent-color, #6366f1)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {job ? 'Update Job' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}
