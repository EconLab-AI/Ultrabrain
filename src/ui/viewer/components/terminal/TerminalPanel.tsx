import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTerminalWebSocket, WSMessage } from '../../hooks/useTerminalWebSocket';
import { TerminalToolbar } from './TerminalToolbar';
import { TerminalTab } from './TerminalTab';
import { SplitPane } from './SplitPane';

interface TerminalInstance {
  id: string;
  shell: string;
  title: string;
  dataBuffer: string;
}

interface SplitNode {
  type: 'terminal' | 'split';
  terminalId?: string;
  direction?: 'horizontal' | 'vertical';
  children?: [SplitNode, SplitNode];
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#0d0d1a',
  color: '#e0e0e0',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#12121f',
  borderBottom: '1px solid #2d2d44',
  overflowX: 'auto',
  flexShrink: 0,
};

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  fontSize: '12px',
  color: isActive ? '#e0e0e0' : '#7a7a9a',
  backgroundColor: isActive ? '#1a1a2e' : 'transparent',
  borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
  borderRight: '1px solid #1e1e35',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background-color 0.15s, color 0.15s',
  fontFamily: 'inherit',
});

const tabCloseBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px',
  borderRadius: '3px',
  fontSize: '14px',
  lineHeight: 1,
  color: '#666',
  cursor: 'pointer',
  transition: 'background-color 0.15s, color 0.15s',
};

const addTabBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  margin: '0 4px',
  fontSize: '16px',
  color: '#7a7a9a',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.15s, color 0.15s',
  fontFamily: 'inherit',
};

const terminalAreaStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#5a5a7a',
  fontSize: '14px',
  gap: '12px',
};

let terminalCounter = 0;

export function TerminalPanel() {
  const { connect, disconnect, send, on, connectionState } = useTerminalWebSocket();
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedShell, setSelectedShell] = useState('zsh');
  const [splitRoot, setSplitRoot] = useState<SplitNode | null>(null);
  const dataBufferRef = useRef<Map<string, string>>(new Map());
  const [dataVersion, setDataVersion] = useState(0);

  // Connect WebSocket on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Listen for terminal output
  useEffect(() => {
    const unsub = on('output', (msg: WSMessage) => {
      if (msg.terminalId && msg.data) {
        const prev = dataBufferRef.current.get(msg.terminalId) || '';
        dataBufferRef.current.set(msg.terminalId, prev + msg.data);
        setDataVersion(v => v + 1);
      }
    });
    return unsub;
  }, [on]);

  // Listen for terminal created confirmation
  useEffect(() => {
    const unsub = on('created', (msg: WSMessage) => {
      if (msg.terminalId) {
        const shell = msg.shell || selectedShell;
        const shortId = msg.terminalId.slice(0, 6);
        const newTerminal: TerminalInstance = {
          id: msg.terminalId,
          shell,
          title: `${shell} (${shortId})`,
          dataBuffer: '',
        };
        setTerminals(prev => [...prev, newTerminal]);
        setActiveId(msg.terminalId);

        // If no split root, create one
        setSplitRoot(prev => {
          if (!prev) {
            return { type: 'terminal', terminalId: msg.terminalId };
          }
          return prev;
        });
      }
    });
    return unsub;
  }, [on, selectedShell]);

  // Listen for terminal exit
  useEffect(() => {
    const unsub = on('exited', (msg: WSMessage) => {
      if (msg.terminalId) {
        handleCloseTerminal(msg.terminalId);
      }
    });
    return unsub;
  }, [on]);

  const createTerminal = useCallback(() => {
    terminalCounter++;
    const tempId = `temp-${terminalCounter}`;
    send({
      type: 'create',
      shell: selectedShell,
    });
  }, [send, selectedShell]);

  const handleCloseTerminal = useCallback((id: string) => {
    send({ type: 'destroy', terminalId: id });
    dataBufferRef.current.delete(id);

    setTerminals(prev => {
      const next = prev.filter(t => t.id !== id);
      return next;
    });

    setActiveId(prev => {
      if (prev === id) {
        // Switch to another tab
        const remaining = terminals.filter(t => t.id !== id);
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return prev;
    });

    // Remove from split tree
    setSplitRoot(prev => {
      if (!prev) return null;
      return removeTerminalFromTree(prev, id);
    });
  }, [send, terminals]);

  const handleTerminalData = useCallback((terminalId: string, data: string) => {
    send({ type: 'input', terminalId, data });
  }, [send]);

  const handleResize = useCallback((terminalId: string, cols: number, rows: number) => {
    send({ type: 'resize', terminalId, cols, rows });
  }, [send]);

  const handleClear = useCallback(() => {
    if (activeId) {
      // Send clear escape sequence
      send({ type: 'input', terminalId: activeId, data: '\x1b[2J\x1b[H' });
    }
  }, [send, activeId]);

  const handleSplit = useCallback((direction: 'horizontal' | 'vertical') => {
    if (!activeId) return;
    // Create a new terminal first, then we'll adjust the tree on 'created'
    terminalCounter++;
    send({ type: 'create', shell: selectedShell });

    // We'll update the split tree when the 'created' message arrives
    const pendingHandler = on('created', (msg: WSMessage) => {
      if (msg.terminalId) {
        setSplitRoot(prev => {
          if (!prev) {
            return { type: 'terminal', terminalId: msg.terminalId };
          }
          return insertSplit(prev, activeId, msg.terminalId!, direction);
        });
        pendingHandler(); // Unsubscribe
      }
    });
  }, [activeId, send, selectedShell, on]);

  // Render a split node tree
  const renderSplitNode = (node: SplitNode): React.ReactNode => {
    if (node.type === 'terminal' && node.terminalId) {
      const isActive = node.terminalId === activeId;
      const data = dataBufferRef.current.get(node.terminalId) || '';
      return (
        <div
          style={{ width: '100%', height: '100%', display: isActive ? 'block' : 'none' }}
          key={node.terminalId}
        >
          <TerminalTab
            onData={(d) => handleTerminalData(node.terminalId!, d)}
            dataToWrite={data}
            onResize={(cols, rows) => handleResize(node.terminalId!, cols, rows)}
            isActive={isActive}
          />
        </div>
      );
    }

    if (node.type === 'split' && node.children && node.direction) {
      return (
        <SplitPane direction={node.direction}>
          {[renderSplitNode(node.children[0]), renderSplitNode(node.children[1])] as [React.ReactNode, React.ReactNode]}
        </SplitPane>
      );
    }

    return null;
  };

  // For non-split mode, render all terminals (active visible, others hidden)
  const renderTerminals = () => {
    if (terminals.length === 0) {
      return (
        <div style={emptyStateStyle}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <polyline points="7 10 10 13 7 16" />
            <line x1="13" y1="16" x2="17" y2="16" />
          </svg>
          <span>No terminals open. Click + to create one.</span>
        </div>
      );
    }

    return terminals.map(t => {
      const isActive = t.id === activeId;
      const data = dataBufferRef.current.get(t.id) || '';
      return (
        <div
          key={t.id}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: isActive ? 'visible' : 'hidden',
          }}
        >
          <TerminalTab
            onData={(d) => handleTerminalData(t.id, d)}
            dataToWrite={data}
            onResize={(cols, rows) => handleResize(t.id, cols, rows)}
            isActive={isActive}
          />
        </div>
      );
    });
  };

  return (
    <div style={panelStyle}>
      <TerminalToolbar
        connectionState={connectionState}
        selectedShell={selectedShell}
        onShellChange={setSelectedShell}
        onNewTerminal={createTerminal}
        onSplitHorizontal={() => handleSplit('horizontal')}
        onSplitVertical={() => handleSplit('vertical')}
        onClear={handleClear}
      />

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {terminals.map(t => (
          <div
            key={t.id}
            style={tabStyle(t.id === activeId)}
            onClick={() => setActiveId(t.id)}
            onMouseEnter={(e) => {
              if (t.id !== activeId) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#1a1a30';
                (e.currentTarget as HTMLDivElement).style.color = '#b0b0c0';
              }
            }}
            onMouseLeave={(e) => {
              if (t.id !== activeId) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLDivElement).style.color = '#7a7a9a';
              }
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>{t.title}</span>
            <span
              style={tabCloseBtnStyle}
              onClick={(e) => { e.stopPropagation(); handleCloseTerminal(t.id); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLSpanElement).style.backgroundColor = '#3a3a5a';
                (e.currentTarget as HTMLSpanElement).style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLSpanElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLSpanElement).style.color = '#666';
              }}
              title="Close terminal"
            >
              x
            </span>
          </div>
        ))}
        <button
          style={addTabBtnStyle}
          onClick={createTerminal}
          title="New Terminal"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2a2a45';
            (e.currentTarget as HTMLButtonElement).style.color = '#e0e0e0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#7a7a9a';
          }}
        >
          +
        </button>
      </div>

      {/* Terminal content area */}
      <div style={terminalAreaStyle}>
        {renderTerminals()}
      </div>
    </div>
  );
}

// Helper: remove a terminal from the split tree
function removeTerminalFromTree(node: SplitNode, terminalId: string): SplitNode | null {
  if (node.type === 'terminal') {
    return node.terminalId === terminalId ? null : node;
  }
  if (node.type === 'split' && node.children) {
    const left = removeTerminalFromTree(node.children[0], terminalId);
    const right = removeTerminalFromTree(node.children[1], terminalId);
    if (!left && !right) return null;
    if (!left) return right;
    if (!right) return left;
    return { ...node, children: [left, right] };
  }
  return node;
}

// Helper: insert a split at the node containing targetId
function insertSplit(node: SplitNode, targetId: string, newId: string, direction: 'horizontal' | 'vertical'): SplitNode {
  if (node.type === 'terminal' && node.terminalId === targetId) {
    return {
      type: 'split',
      direction,
      children: [
        { type: 'terminal', terminalId: targetId },
        { type: 'terminal', terminalId: newId },
      ],
    };
  }
  if (node.type === 'split' && node.children) {
    return {
      ...node,
      children: [
        insertSplit(node.children[0], targetId, newId, direction),
        insertSplit(node.children[1], targetId, newId, direction),
      ],
    };
  }
  return node;
}
