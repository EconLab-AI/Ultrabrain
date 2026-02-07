import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Task {
  id: number;
  project: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  created_at_epoch: number;
  updated_at_epoch: number;
  completed_at_epoch: number | null;
}

interface KanbanViewProps {
  currentProject: string;
  projects: string[];
}

const COLUMNS = [
  { id: 'todo', label: 'TODO' },
  { id: 'in_progress', label: 'IN PROGRESS' },
  { id: 'done', label: 'DONE' },
] as const;

const PRIORITY_DOTS: Record<string, string> = {
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

export function KanbanView({ currentProject, projects }: KanbanViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterProject, setFilterProject] = useState(currentProject);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProject, setNewProject] = useState(currentProject || projects[0] || '');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(() => {
    const url = filterProject ? `/api/tasks?project=${encodeURIComponent(filterProject)}` : '/api/tasks';
    fetch(url)
      .then(res => res.json())
      .then(data => setTasks(data.tasks || []))
      .catch(err => console.error('Failed to fetch tasks:', err));
  }, [filterProject]);

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

  const deleteTask = useCallback((taskId: number) => {
    fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(() => fetchTasks())
      .catch(err => console.error('Failed to delete task:', err));
  }, [fetchTasks]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(task.id));
    // Add dragging class after a tick
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
        <h2 className="kanban-title">Kanban Board</h2>
        <div className="kanban-controls">
          <select
            className="kanban-project-filter"
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
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
                  >
                    <div className="kanban-task-top">
                      <span className={`kanban-priority-dot ${PRIORITY_DOTS[task.priority] || ''}`} title={task.priority} />
                      <span className="kanban-task-title">{task.title}</span>
                      <button className="kanban-task-delete" onClick={() => deleteTask(task.id)} title="Delete">&times;</button>
                    </div>
                    {task.description && (
                      <div className="kanban-task-desc">{task.description}</div>
                    )}
                    <div className="kanban-task-meta">
                      <span className="kanban-category-badge">{task.category}</span>
                      {!filterProject && <span className="kanban-project-tag">{task.project}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
