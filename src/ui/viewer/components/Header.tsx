import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain3D } from './Brain3D';
import { GitHubStarsButton } from './GitHubStarsButton';
import { useSpinningFavicon } from '../hooks/useSpinningFavicon';

interface HeaderProps {
  isConnected: boolean;
  isProcessing: boolean;
  queueDepth: number;
  onContextPreviewToggle: () => void;
}

export function Header({
  isConnected,
  isProcessing,
  queueDepth,
  onContextPreviewToggle
}: HeaderProps) {
  useSpinningFavicon(isProcessing);

  // PWA install prompt
  const deferredPrompt = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Already installed as standalone?
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const result = await deferredPrompt.current.userChoice;
    if (result.outcome === 'accepted') {
      setCanInstall(false);
    }
    deferredPrompt.current = null;
  }, []);

  return (
    <div className="header">
      {/* EconLab logo */}
      <div className="iconnet-placeholder">
        <img src="assets/econlab_logo.png" alt="EconLab" className="econlab-logo" />
      </div>

      {/* 3D Brain with queue bubble */}
      <div className="brain-wrapper">
        <Brain3D isProcessing={isProcessing} size={120} />
        {queueDepth > 0 && (
          <div className="queue-bubble">{queueDepth}</div>
        )}
      </div>

      {/* Logo text */}
      <div className="logo-text-group">
        <span className="logo-text">ULTRABRAIN</span>
        <span className="logo-version">v1.0</span>
      </div>

      {/* Social icons row */}
      <div className="header-social-row">
        <a
          href="https://x.com/Econlab_DE"
          target="_blank"
          rel="noopener noreferrer"
          className="header-social-icon"
          title="Follow @Econlab_DE on X"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <span className="header-social-divider">&middot;</span>
        <GitHubStarsButton username="EconLab-AI" repo="Ultrabrain" />
        {canInstall && (
          <>
            <span className="header-social-divider">&middot;</span>
            <button
              className="header-social-icon pwa-install-btn"
              onClick={handleInstall}
              title="Install as App"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </>
        )}
        <span className="header-social-divider">&middot;</span>
        <button
          className="header-social-icon"
          onClick={onContextPreviewToggle}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </div>
  );
}
