import React from 'react';
import { ConnectionState } from '../../hooks/useTerminalWebSocket';

interface TerminalToolbarProps {
  connectionState: ConnectionState;
  selectedShell: string;
  onShellChange: (shell: string) => void;
  onNewTerminal: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  onClear: () => void;
}

const SHELLS = ['bash', 'zsh', 'sh'];

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: '#161625',
  borderBottom: '1px solid #2d2d44',
  flexShrink: 0,
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  fontSize: '12px',
  color: '#c0c0d0',
  backgroundColor: 'transparent',
  border: '1px solid #3a3a5a',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.15s, border-color 0.15s',
  fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '12px',
  color: '#c0c0d0',
  backgroundColor: '#1a1a2e',
  border: '1px solid #3a3a5a',
  borderRadius: '4px',
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
};

function StatusDot({ state }: { state: ConnectionState }) {
  const color = state === 'connected' ? '#10b981'
    : state === 'connecting' ? '#f59e0b'
    : '#ef4444';
  const label = state === 'connected' ? 'Connected'
    : state === 'connecting' ? 'Connecting...'
    : state === 'error' ? 'Error'
    : 'Disconnected';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto', fontSize: '11px', color: '#888' }}>
      <div style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}`,
      }} />
      <span>{label}</span>
    </div>
  );
}

export function TerminalToolbar({
  connectionState,
  selectedShell,
  onShellChange,
  onNewTerminal,
  onSplitHorizontal,
  onSplitVertical,
  onClear,
}: TerminalToolbarProps) {
  const handleHover = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    const el = e.currentTarget;
    el.style.backgroundColor = enter ? '#2a2a45' : 'transparent';
    el.style.borderColor = enter ? '#5a5a8a' : '#3a3a5a';
  };

  return (
    <div style={toolbarStyle}>
      <button
        style={buttonStyle}
        onClick={onNewTerminal}
        title="New Terminal"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New
      </button>

      <button
        style={buttonStyle}
        onClick={onSplitHorizontal}
        title="Split Horizontal"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        Split H
      </button>

      <button
        style={buttonStyle}
        onClick={onSplitVertical}
        title="Split Vertical"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" />
        </svg>
        Split V
      </button>

      <button
        style={buttonStyle}
        onClick={onClear}
        title="Clear Terminal"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
        </svg>
        Clear
      </button>

      <select
        style={selectStyle}
        value={selectedShell}
        onChange={(e) => onShellChange(e.target.value)}
        title="Shell"
      >
        {SHELLS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <StatusDot state={connectionState} />
    </div>
  );
}
