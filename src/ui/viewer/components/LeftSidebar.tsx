import React, { useState, useEffect } from 'react';

export type ViewType = 'feed' | 'projects' | 'kanban' | 'claude-desktop'
  | 'pm-overview' | 'pm-bugs' | 'pm-todos' | 'pm-ideas' | 'pm-learnings' | 'pm-tags'
  | 'current-state' | 'claude-md' | 'loop' | 'teams';

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const PM_ITEMS: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  {
    view: 'pm-overview',
    label: 'Overview',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    view: 'current-state',
    label: 'Current State',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    view: 'pm-bugs',
    label: 'Bugs & Fixes',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    view: 'pm-todos',
    label: 'Todos',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    view: 'pm-ideas',
    label: 'Ideas',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
    ),
  },
  {
    view: 'pm-learnings',
    label: 'Learnings',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    view: 'pm-tags',
    label: 'Tags',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    view: 'kanban',
    label: 'Kanban',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

export function LeftSidebar({ isOpen, onToggle, currentView, onViewChange }: LeftSidebarProps) {
  const [pmExpanded, setPmExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem('ub-pm-expanded');
      return stored ? JSON.parse(stored) : false;
    } catch { return false; }
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('ub-sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('ub-pm-expanded', JSON.stringify(pmExpanded));
  }, [pmExpanded]);

  // Auto-expand PM section when a PM, kanban, or current-state view is active
  const isPmView = currentView.startsWith('pm-') || currentView === 'kanban' || currentView === 'current-state';
  useEffect(() => {
    if (isPmView && !pmExpanded) {
      setPmExpanded(true);
    }
  }, [isPmView]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && <div className="left-sidebar-backdrop" onClick={onToggle} />}

      <nav className={`left-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="left-sidebar-header">
          <span className="left-sidebar-title">NAV</span>
        </div>

        <div className="left-sidebar-nav">
          {/* 1. Projects */}
          <button
            className={`left-sidebar-item ${currentView === 'projects' ? 'active' : ''}`}
            onClick={() => onViewChange('projects')}
          >
            <span className="left-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="left-sidebar-item-label">Projects</span>
          </button>

          {/* Feed (shown as sub-item under Projects when feed is active) */}
          {currentView === 'feed' && (
            <button
              className="left-sidebar-item left-sidebar-sub-item active"
              style={{ paddingLeft: '2rem' }}
            >
              <span className="left-sidebar-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
                </svg>
              </span>
              <span className="left-sidebar-item-label">Feed</span>
            </button>
          )}

          {/* 2. Project Management */}
          <div className="left-sidebar-divider" />
          <button
            className={`left-sidebar-item ${isPmView ? 'active' : ''}`}
            onClick={() => {
              setPmExpanded(!pmExpanded);
              if (!isPmView) onViewChange('pm-overview');
            }}
          >
            <span className="left-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
              </svg>
            </span>
            <span className="left-sidebar-item-label">Project Management</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                marginLeft: 'auto',
                transform: pmExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                opacity: 0.5,
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* PM Sub-items */}
          {pmExpanded && PM_ITEMS.map(item => (
            <button
              key={item.view}
              className={`left-sidebar-item left-sidebar-sub-item ${currentView === item.view ? 'active' : ''}`}
              onClick={() => onViewChange(item.view)}
              style={{ paddingLeft: '2rem' }}
            >
              <span className="left-sidebar-item-icon">{item.icon}</span>
              <span className="left-sidebar-item-label">{item.label}</span>
            </button>
          ))}

          {/* 3. CLAUDE.md */}
          <div className="left-sidebar-divider" />
          <button
            className={`left-sidebar-item ${currentView === 'claude-md' ? 'active' : ''}`}
            onClick={() => onViewChange('claude-md')}
          >
            <span className="left-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <span className="left-sidebar-item-label">CLAUDE.md</span>
          </button>

          {/* 4. Claude Desktop */}
          <button
            className={`left-sidebar-item ${currentView === 'claude-desktop' ? 'active' : ''}`}
            onClick={() => onViewChange('claude-desktop')}
          >
            <span className="left-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </span>
            <span className="left-sidebar-item-label">Claude Desktop</span>
          </button>

          {/* 5. Ralph Loop */}
          <button
            className={`left-sidebar-item ${currentView === 'loop' ? 'active' : ''}`}
            onClick={() => onViewChange('loop')}
          >
            <span className="left-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </span>
            <span className="left-sidebar-item-label">Ralph Loop</span>
          </button>

          {/* 6. Agent Teams */}
          <button
            className={`left-sidebar-item ${currentView === 'teams' ? 'active' : ''}`}
            onClick={() => onViewChange('teams')}
          >
            <span className="left-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="left-sidebar-item-label">Agent Teams</span>
          </button>
        </div>

        {/* Arrow handle */}
        <button className="sidebar-handle" onClick={onToggle} title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`sidebar-handle-arrow ${isOpen ? 'open' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>
    </>
  );
}
