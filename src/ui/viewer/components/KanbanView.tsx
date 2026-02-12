import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Task {
  id: number;
  project: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  observation_id: number | null;
  created_at_epoch: number;
  updated_at_epoch: number;
  completed_at_epoch: number | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature: '#10b981',
  task: '#3b82f6',
};

interface KanbanViewProps {
  currentProject: string;
  projects: string[];
}

const COLUMNS = [
  { id: 'todo', label: 'TODO' },
  { id: 'in_progress', label: 'IN PROGRESS' },
  { id: 'stale', label: 'STALE' },
  { id: 'done', label: 'DONE' },
] as const;

const PRIORITY_DOTS: Record<string, string> = {
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

export function KanbanView({ currentProject, projects }: KanbanViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProject, setNewProject] = useState(currentProject || projects[0] || '');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(() => {
    const url = currentProject ? `/api/tasks?project=${encodeURIComponent(currentProject)}` : '/api/tasks';
    fetch(url)
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []))
      .catch(err => console.error('Failed to fetch tasks:', err));
  }, [currentProject]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (showAddForm && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [showAddForm]);

  const createTask = useCallback(() => {
    if (!newTitle.trim()) return;
    const project = newProject || currentProject || projects[0] || 'default';

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        project,
      }),
    })
      .then(res => res.json())
      .then(() => {
        setNewTitle('');
        setNewDescription('');
        setShowAddForm(false);
        fetchTasks();
      })
      .catch(err => console.error('Failed to create task:', err));
  }, [newTitle, newDescription, newProject, currentProject, projects, fetchTasks]);

  const updateTaskStatus = useCallback((taskId: number, status: string) => {
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(() => fetchTasks())
      .catch(err => console.error('Failed to update task:', err));
  }, [fetchTasks]);

  const updateTask = useCallback((taskId: number, updates: Partial<Task>) => {
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
      .then(() => {
        fetchTasks();
        setSelectedTask(null);
      })
      .catch(err => console.error('Failed to update task:', err));
  }, [fetchTasks]);

  const deleteTask = useCallback((taskId: number) => {
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(() => {
        fetchTasks();
        setSelectedTask(null);
      })
      .catch(err => console.error('Failed to delete task:', err));
  }, [fetchTasks]);

  const handleBackfill = useCallback(async () => {
    const project = currentProject || projects[0];
    if (!project) return;
    setBackfillStatus('Populating...');
    try {
      const res = await fetch(`/api/tasks/backfill?project=${encodeURIComponent(project)}`, { method: 'POST' });
      const data = await res.json();
      setBackfillStatus(`Created ${data.created} tasks${data.tagsApplied ? `, applied ${data.tagsApplied} tags` : ''}`);
      fetchTasks();
    } catch {
      setBackfillStatus('Backfill failed');
    }
  }, [currentProject, projects, fetchTasks]);

  const handleMarkStale = useCallback(async () => {
    const project = currentProject || projects[0];
    if (!project) return;
    setBulkStatus('Marking stale...');
    try {
      const res = await fetch('/api/tasks/bulk-stale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, staleDays: 30 }),
      });
      const data = await res.json();
      setBulkStatus(`Marked ${data.marked} task(s) as stale`);
      fetchTasks();
    } catch {
      setBulkStatus('Mark stale failed');
    }
  }, [currentProject, projects, fetchTasks]);

  const handleCloseStale = useCallback(async () => {
    const project = currentProject || projects[0];
    if (!project) return;
    setBulkStatus('Closing stale...');
    try {
      const res = await fetch('/api/tasks/bulk-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, status: 'stale' }),
      });
      const data = await res.json();
      setBulkStatus(`Closed ${data.closed} stale task(s)`);
      fetchTasks();
    } catch {
      setBulkStatus('Close stale failed');
    }
  }, [currentProject, projects, fetchTasks]);

  const handleDeduplicate = useCallback(async () => {
    const project = currentProject || projects[0];
    if (!project) return;
    setBulkStatus('Finding duplicates...');
    try {
      // Dry run first
      const dryRes = await fetch('/api/tasks/deduplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, dryRun: true }),
      });
      const dryData = await dryRes.json();
      const count = dryData.duplicates?.length || 0;
      if (count === 0) {
        setBulkStatus('No duplicates found');
        return;
      }
      if (!confirm(`Found ${count} duplicate(s). Close them?`)) {
        setBulkStatus(`Found ${count} duplicate(s) — cancelled`);
        return;
      }
      // Execute
      const res = await fetch('/api/tasks/deduplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, dryRun: false }),
      });
      const data = await res.json();
      setBulkStatus(`Closed ${data.totalClosed} duplicate(s)`);
      fetchTasks();
    } catch {
      setBulkStatus('Deduplicate failed');
    }
  }, [currentProject, projects, fetchTasks]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(task.id));
    requestAnimationFrame(() => {
      const el = document.getElementById(`task-${task.id}`);
      if (el) el.classList.add('dragging');
    });
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== columnId) {
      updateTaskStatus(draggedTask.id, columnId);
    }
    setDraggedTask(null);
  };

  const getColumnTasks = (status: string) => tasks.filter(t => t.status === status);

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className="kanban-title">Kanban Board</h2>
        </div>
        <div className="kanban-controls" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {(backfillStatus || bulkStatus) && (
            <span style={{ fontSize: '0.72rem', opacity: 0.6, marginRight: '4px' }}>{bulkStatus || backfillStatus}</span>
          )}
          <button
            onClick={handleBackfill}
            style={{
              background: 'none',
              border: '1px solid var(--border-color, #333)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              color: 'var(--text-muted, #888)',
            }}
            title="Create tasks from tagged observations"
          >
            Populate
          </button>
          <button
            onClick={handleMarkStale}
            style={{
              background: 'none',
              border: '1px solid var(--border-color, #333)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              color: '#f59e0b',
            }}
            title="Mark todos older than 30 days as stale"
          >
            Mark Stale
          </button>
          <button
            onClick={handleCloseStale}
            style={{
              background: 'none',
              border: '1px solid var(--border-color, #333)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              color: '#ef4444',
            }}
            title="Close all stale tasks"
          >
            Close Stale
          </button>
          <button
            onClick={handleDeduplicate}
            style={{
              background: 'none',
              border: '1px solid var(--border-color, #333)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              color: '#8b5cf6',
            }}
            title="Find and close duplicate tasks"
          >
            Deduplicate
          </button>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const columnTasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className={`kanban-column ${dragOverColumn === col.id ? 'drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="kanban-column-header">
                <span className="kanban-column-title">{col.label}</span>
                <span className="kanban-column-count">{columnTasks.length}</span>
                {col.id === 'todo' && (
                  <button
                    className="kanban-add-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                    title="Add task"
                  >
                    +
                  </button>
                )}
              </div>

              {col.id === 'todo' && showAddForm && (
                <div className="kanban-add-form">
                  <input
                    ref={titleInputRef}
                    type="text"
                    className="kanban-add-input"
                    placeholder="Task title..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') createTask();
                      if (e.key === 'Escape') setShowAddForm(false);
                    }}
                  />
                  <textarea
                    className="kanban-add-textarea"
                    placeholder="Description (optional)"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    rows={2}
                  />
                  {projects.length > 1 && (
                    <select
                      className="kanban-add-project"
                      value={newProject}
                      onChange={e => setNewProject(e.target.value)}
                    >
                      {projects.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                  <div className="kanban-add-actions">
                    <button className="kanban-add-submit" onClick={createTask}>Add</button>
                    <button className="kanban-add-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="kanban-column-tasks">
                {columnTasks.map(task => (
                  <div
                    key={task.id}
                    id={`task-${task.id}`}
                    className="kanban-task-card"
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="kanban-task-top">
                      <span className={`kanban-priority-dot ${PRIORITY_DOTS[task.priority] || ''}`} title={task.priority} />
                      <span className="kanban-task-title">{task.title}</span>
                      <button
                        className="kanban-task-delete"
                        onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                    {task.description && (
                      <div className="kanban-task-desc">{task.description}</div>
                    )}
                    <div className="kanban-task-meta">
                      <span
                        className="kanban-category-badge"
                        style={{
                          background: `${CATEGORY_COLORS[task.category] || '#6366f1'}20`,
                          color: CATEGORY_COLORS[task.category] || '#6366f1',
                        }}
                      >
                        {task.category}
                      </span>
                      {task.observation_id && (
                        <span
                          className="kanban-obs-link"
                          style={{
                            fontSize: '0.65rem',
                            opacity: 0.5,
                            cursor: 'pointer',
                          }}
                          title={`Linked to observation #${task.observation_id}`}
                        >
                          obs#{task.observation_id}
                        </span>
                      )}
                      {!currentProject && <span className="kanban-project-tag">{task.project}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onSave={(updates) => updateTask(selectedTask.id, updates)}
          onDelete={() => deleteTask(selectedTask.id)}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

interface TaskDetailModalProps {
  task: Task;
  onSave: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function TaskDetailModal({ task, onSave, onDelete, onClose }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);

  const handleSave = () => {
    onSave({ title, description: description || null, status, priority });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg-secondary, #1a1a2e)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #333)',
          padding: '24px',
          width: '480px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>Task #{task.id}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted, #888)', fontSize: '1.2rem',
            }}
          >
            &times;
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid var(--border-color, #333)',
            background: 'var(--color-bg-primary, #0f0f1a)',
            color: 'inherit',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description..."
          rows={4}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '0.85rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #333)',
            background: 'var(--color-bg-primary, #0f0f1a)',
            color: 'inherit',
            marginBottom: '12px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {/* Status + Priority row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #333)',
                background: 'var(--color-bg-primary, #0f0f1a)',
                color: 'inherit',
              }}
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="stale">Stale</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #333)',
                background: 'var(--color-bg-primary, #0f0f1a)',
                color: 'inherit',
              }}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Meta info */}
        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '16px' }}>
          <div>Category: {task.category}</div>
          {task.observation_id && <div>Linked observation: #{task.observation_id}</div>}
          <div>Created: {new Date(task.created_at_epoch).toLocaleString()}</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <button
            onClick={onDelete}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid #ef444440',
              background: '#ef444410',
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #333)',
                background: 'none',
                color: 'var(--text-muted, #888)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent-color, #6366f1)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
