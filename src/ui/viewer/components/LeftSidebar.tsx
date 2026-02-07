import React, { useEffect } from 'react';

export type ViewType = 'feed' | 'projects' | 'kanban' | 'claude-desktop';

interface LeftSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const NAV_ITEMS: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  {
    view: 'feed',
    label: 'Feed',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
  },
  {
    view: 'projects',
    label: 'Projects',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    view: 'kanban',
    label: 'Kanban',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    view: 'claude-desktop',
    label: 'Claude Desktop',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export function LeftSidebar({ isOpen, onToggle, currentView, onViewChange }: LeftSidebarProps) {
  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('ub-sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && <div className="left-sidebar-backdrop" onClick={onToggle} />}

      <nav className={`left-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="left-sidebar-header">
          <span className="left-sidebar-title">NAV</span>
        </div>

        <div className="left-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.view}
              className={`left-sidebar-item ${currentView === item.view ? 'active' : ''}`}
              onClick={() => onViewChange(item.view)}
            >
              <span className="left-sidebar-item-icon">{item.icon}</span>
              <span className="left-sidebar-item-label">{item.label}</span>
            </button>
          ))}
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
