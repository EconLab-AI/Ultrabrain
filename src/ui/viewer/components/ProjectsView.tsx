import React, { useState, useEffect } from 'react';

interface ProjectStat {
  name: string;
  observationCount: number;
  summaryCount: number;
  lastActivity: number;
}

interface ProjectsViewProps {
  onSelectProject: (project: string) => void;
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

export function ProjectsView({ onSelectProject }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects/stats')
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="projects-container">
        <div className="projects-header">
          <h2 className="projects-title">Projects</h2>
        </div>
        <div className="projects-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="project-card skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-subtitle" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h2 className="projects-title">Projects</h2>
        <span className="projects-count">{projects.length} projects</span>
      </div>

      {projects.length === 0 ? (
        <div className="projects-empty">No projects found. Start using UltraBrain to see your projects here.</div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <button
              key={project.name}
              className="project-card"
              onClick={() => onSelectProject(project.name)}
            >
              <div className="project-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="project-card-name">{project.name}</div>
              <div className="project-card-stats">
                <span>{project.observationCount} obs</span>
                <span className="project-card-dot">&middot;</span>
                <span>{project.summaryCount} sum</span>
              </div>
              <div className="project-card-activity">
                {formatRelativeTime(project.lastActivity)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
