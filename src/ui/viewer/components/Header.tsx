import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ThemePreference } from '../hooks/useTheme';
import { GitHubStarsButton } from './GitHubStarsButton';
import { useSpinningFavicon } from '../hooks/useSpinningFavicon';

interface HeaderProps {
  isConnected: boolean;
  projects: string[];
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  isProcessing: boolean;
  queueDepth: number;
  themePreference: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onContextPreviewToggle: () => void;
}

function BrainLogo({ isProcessing }: { isProcessing: boolean }) {
  return (
    <svg
      className={`logomark ${isProcessing ? 'spinning' : ''}`}
      width="28"
      height="28"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ub-brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB"/>
          <stop offset="45%" stopColor="#4F46E5"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
        <linearGradient id="ub-node-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD"/>
          <stop offset="100%" stopColor="#C4B5FD"/>
        </linearGradient>
      </defs>
      <path d="M 93 20 C 58 20, 16 52, 16 100 C 16 148, 58 180, 93 180 Z" fill="url(#ub-brain-grad)" opacity="0.95"/>
      <path d="M 107 20 C 142 20, 184 52, 184 100 C 184 148, 142 180, 107 180 Z" fill="url(#ub-brain-grad)" opacity="0.88"/>
      <path d="M 30 62 Q 54 73, 87 66" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 26 100 Q 50 113, 87 104" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 30 138 Q 54 148, 87 142" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 170 62 Q 146 73, 113 66" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 174 100 Q 150 113, 113 104" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 170 138 Q 146 148, 113 142" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <line x1="54" y1="54" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="146" y1="54" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="46" y1="100" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="154" y1="100" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="54" y1="146" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.15"/>
      <line x1="146" y1="146" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.15"/>
      <circle cx="54" cy="54" r="4.5" fill="url(#ub-node-glow)" opacity="0.85"/>
      <circle cx="146" cy="54" r="4.5" fill="url(#ub-node-glow)" opacity="0.85"/>
      <circle cx="46" cy="100" r="3.5" fill="url(#ub-node-glow)" opacity="0.75"/>
      <circle cx="154" cy="100" r="3.5" fill="url(#ub-node-glow)" opacity="0.75"/>
      <circle cx="54" cy="146" r="3.5" fill="url(#ub-node-glow)" opacity="0.70"/>
      <circle cx="146" cy="146" r="3.5" fill="url(#ub-node-glow)" opacity="0.70"/>
      <circle cx="100" cy="100" r="6" fill="white" opacity="0.92"/>
      <circle cx="100" cy="100" r="3.5" fill="url(#ub-brain-grad)" opacity="0.6"/>
    </svg>
  );
}

export function Header({
  isConnected,
  projects,
  currentFilter,
  onFilterChange,
  isProcessing,
  queueDepth,
  themePreference,
  onThemeChange,
  onContextPreviewToggle
}: HeaderProps) {
  useSpinningFavicon(isProcessing);

  return (
    <div className="header">
      <h1>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <BrainLogo isProcessing={isProcessing} />
          {queueDepth > 0 && (
            <div className="queue-bubble">
              {queueDepth}
            </div>
          )}
        </div>
        <span className="logo-text">ULTRABRAIN</span>
        <span className="logo-version">v1.0</span>
      </h1>
      <div className="status">
        <a
          href="https://x.com/Econlab_DE"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-link"
          title="Follow @Econlab_DE on X"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <GitHubStarsButton username="EconLab-AI" repo="Ultrabrain" />
        <select
          value={currentFilter}
          onChange={e => onFilterChange(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project} value={project}>{project}</option>
          ))}
        </select>
        <ThemeToggle
          preference={themePreference}
          onThemeChange={onThemeChange}
        />
        <button
          className="settings-btn"
          onClick={onContextPreviewToggle}
          title="Settings"
        >
          <svg className="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </div>
  );
}
