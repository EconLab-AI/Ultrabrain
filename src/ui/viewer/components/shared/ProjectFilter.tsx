import React from 'react';

interface ProjectFilterProps {
  value: string;
  onChange: (project: string) => void;
  projects: string[];
}

export function ProjectFilter({ value, onChange, projects }: ProjectFilterProps) {
  return (
    <select
      className="kanban-project-filter"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '4px 8px',
        fontSize: '0.8rem',
        borderRadius: '6px',
        border: '1px solid var(--color-border-primary, #333)',
        background: 'var(--color-bg-secondary, #1a1a2e)',
        color: 'inherit',
        cursor: 'pointer',
        minWidth: '140px',
      }}
    >
      <option value="">All Projects</option>
      {projects.map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}
