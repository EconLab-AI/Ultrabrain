import crypto from 'crypto';
import { logger } from '../../../utils/logger.js';
import { PtyFallback } from './PtyFallback.js';
import { TerminalMetadata, ManagedTerminal } from './types.js';

const MAX_SCROLLBACK = 10000;

export class TerminalManager {
  private terminals: Map<string, ManagedTerminal> = new Map();
  private ptyModule: any = null;
  private ptyLoadAttempted = false;

  private loadPty(): any {
    if (this.ptyLoadAttempted) return this.ptyModule;
    this.ptyLoadAttempted = true;

    try {
      this.ptyModule = require('node-pty');
      logger.info('TERMINAL', 'node-pty loaded successfully');
    } catch {
      logger.warn('TERMINAL', 'node-pty not available, using child_process fallback');
      this.ptyModule = null;
    }

    return this.ptyModule;
  }

  spawn(shell?: string, cwd?: string, cols?: number, rows?: number, project?: string): ManagedTerminal {
    const id = crypto.randomUUID();
    const resolvedShell = shell || process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash');
    const resolvedCwd = cwd || process.cwd();
    const resolvedCols = cols || 80;
    const resolvedRows = rows || 24;

    const env = { ...process.env } as Record<string, string>;
    env.TERM = env.TERM || 'xterm-256color';

    let pty: any;
    const nodePty = this.loadPty();

    if (nodePty) {
      pty = nodePty.spawn(resolvedShell, [], {
        name: 'xterm-256color',
        cols: resolvedCols,
        rows: resolvedRows,
        cwd: resolvedCwd,
        env,
      });
    } else {
      pty = new PtyFallback(resolvedShell, [], {
        cols: resolvedCols,
        rows: resolvedRows,
        cwd: resolvedCwd,
        env,
      });
    }

    const metadata: TerminalMetadata = {
      id,
      shell: resolvedShell,
      cwd: resolvedCwd,
      project,
      cols: resolvedCols,
      rows: resolvedRows,
      createdAt: Date.now(),
      isAlive: true,
    };

    const managed: ManagedTerminal = {
      id,
      pty,
      metadata,
      scrollback: [],
      subscribers: new Set(),
    };

    pty.onData((data: string) => {
      this.appendScrollback(managed, data);
      for (const ws of managed.subscribers) {
        try {
          ws.send(JSON.stringify({ type: 'output', terminalId: id, data }));
        } catch {
          managed.subscribers.delete(ws);
        }
      }
    });

    pty.onExit((_exitCode: number) => {
      managed.metadata.isAlive = false;
      for (const ws of managed.subscribers) {
        try {
          ws.send(JSON.stringify({ type: 'destroyed', terminalId: id }));
        } catch {
          // ignore
        }
      }
      managed.subscribers.clear();
      logger.info('TERMINAL', 'Terminal process exited', { id });
    });

    this.terminals.set(id, managed);
    logger.info('TERMINAL', 'Terminal spawned', { id, shell: resolvedShell, cwd: resolvedCwd, project });

    return managed;
  }

  private appendScrollback(terminal: ManagedTerminal, data: string): void {
    const lines = data.split('\n');
    for (const line of lines) {
      terminal.scrollback.push(line);
    }
    while (terminal.scrollback.length > MAX_SCROLLBACK) {
      terminal.scrollback.shift();
    }
  }

  resize(terminalId: string, cols: number, rows: number): boolean {
    const terminal = this.terminals.get(terminalId);
    if (!terminal || !terminal.metadata.isAlive) return false;

    try {
      terminal.pty.resize(cols, rows);
      terminal.metadata.cols = cols;
      terminal.metadata.rows = rows;
      return true;
    } catch (error) {
      logger.error('TERMINAL', 'Failed to resize terminal', { terminalId }, error as Error);
      return false;
    }
  }

  write(terminalId: string, data: string): boolean {
    const terminal = this.terminals.get(terminalId);
    if (!terminal || !terminal.metadata.isAlive) return false;

    try {
      terminal.pty.write(data);
      return true;
    } catch (error) {
      logger.error('TERMINAL', 'Failed to write to terminal', { terminalId }, error as Error);
      return false;
    }
  }

  destroy(terminalId: string): boolean {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return false;

    try {
      if (terminal.metadata.isAlive) {
        terminal.pty.kill();
      }
    } catch {
      // Process may already be dead
    }

    terminal.metadata.isAlive = false;
    for (const ws of terminal.subscribers) {
      try {
        ws.send(JSON.stringify({ type: 'destroyed', terminalId }));
      } catch {
        // ignore
      }
    }
    terminal.subscribers.clear();
    this.terminals.delete(terminalId);

    logger.info('TERMINAL', 'Terminal destroyed', { terminalId });
    return true;
  }

  destroyAll(): void {
    const ids = [...this.terminals.keys()];
    for (const id of ids) {
      this.destroy(id);
    }
    logger.info('TERMINAL', 'All terminals destroyed', { count: ids.length });
  }

  getTerminal(id: string): ManagedTerminal | undefined {
    return this.terminals.get(id);
  }

  listTerminals(): TerminalMetadata[] {
    return [...this.terminals.values()].map(t => ({ ...t.metadata }));
  }

  getScrollback(id: string): string[] {
    const terminal = this.terminals.get(id);
    return terminal ? [...terminal.scrollback] : [];
  }
}
