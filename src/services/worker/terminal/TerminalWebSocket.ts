import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { logger } from '../../../utils/logger.js';
import { TerminalManager } from './TerminalManager.js';
import { WSMessage } from './types.js';

const HEARTBEAT_INTERVAL = 30000;

export class TerminalWebSocket {
  private wss: WebSocketServer;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private terminalManager: TerminalManager) {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocket) => {
      (ws as any).isAlive = true;

      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });

      ws.on('message', (raw: Buffer) => {
        this.handleMessage(ws, raw);
      });

      ws.on('close', () => {
        this.unsubscribeAll(ws);
      });

      ws.on('error', (error: Error) => {
        logger.error('TERMINAL_WS', 'WebSocket error', {}, error);
        this.unsubscribeAll(ws);
      });
    });

    this.startHeartbeat();
  }

  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    const origin = request.headers.origin || '';
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      logger.warn('TERMINAL_WS', 'Rejected non-localhost WebSocket connection', { origin });
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  private handleMessage(ws: WebSocket, raw: Buffer): void {
    let msg: WSMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      this.sendError(ws, 'Invalid JSON');
      return;
    }

    switch (msg.type) {
      case 'create':
        this.handleCreate(ws, msg);
        break;
      case 'input':
        this.handleInput(ws, msg);
        break;
      case 'resize':
        this.handleResize(ws, msg);
        break;
      case 'destroy':
        this.handleDestroy(ws, msg);
        break;
      case 'subscribe':
        this.handleSubscribe(ws, msg);
        break;
      case 'list':
        this.handleList(ws);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${msg.type}`);
    }
  }

  private handleCreate(ws: WebSocket, msg: WSMessage): void {
    try {
      const terminal = this.terminalManager.spawn(
        msg.shell,
        msg.cwd,
        msg.cols,
        msg.rows,
        msg.project
      );

      terminal.subscribers.add(ws);

      this.send(ws, {
        type: 'created',
        terminalId: terminal.id,
        metadata: terminal.metadata,
      });
    } catch (error) {
      this.sendError(ws, `Failed to create terminal: ${(error as Error).message}`);
    }
  }

  private handleInput(ws: WebSocket, msg: WSMessage): void {
    if (!msg.terminalId || !msg.data) {
      this.sendError(ws, 'Missing terminalId or data');
      return;
    }

    const ok = this.terminalManager.write(msg.terminalId, msg.data);
    if (!ok) {
      this.sendError(ws, `Terminal not found or not alive: ${msg.terminalId}`);
    }
  }

  private handleResize(ws: WebSocket, msg: WSMessage): void {
    if (!msg.terminalId || !msg.cols || !msg.rows) {
      this.sendError(ws, 'Missing terminalId, cols, or rows');
      return;
    }

    const ok = this.terminalManager.resize(msg.terminalId, msg.cols, msg.rows);
    if (!ok) {
      this.sendError(ws, `Terminal not found or not alive: ${msg.terminalId}`);
    }
  }

  private handleDestroy(ws: WebSocket, msg: WSMessage): void {
    if (!msg.terminalId) {
      this.sendError(ws, 'Missing terminalId');
      return;
    }

    const ok = this.terminalManager.destroy(msg.terminalId);
    if (!ok) {
      this.sendError(ws, `Terminal not found: ${msg.terminalId}`);
    }
  }

  private handleSubscribe(ws: WebSocket, msg: WSMessage): void {
    if (!msg.terminalId) {
      this.sendError(ws, 'Missing terminalId');
      return;
    }

    const terminal = this.terminalManager.getTerminal(msg.terminalId);
    if (!terminal) {
      this.sendError(ws, `Terminal not found: ${msg.terminalId}`);
      return;
    }

    terminal.subscribers.add(ws);

    // Send existing scrollback
    const scrollback = this.terminalManager.getScrollback(msg.terminalId);
    if (scrollback.length > 0) {
      this.send(ws, {
        type: 'output',
        terminalId: msg.terminalId,
        data: scrollback.join('\n'),
      });
    }
  }

  private handleList(ws: WebSocket): void {
    this.send(ws, {
      type: 'terminals',
      terminals: this.terminalManager.listTerminals(),
    });
  }

  private unsubscribeAll(ws: WebSocket): void {
    const terminals = this.terminalManager.listTerminals();
    for (const meta of terminals) {
      const terminal = this.terminalManager.getTerminal(meta.id);
      if (terminal) {
        terminal.subscribers.delete(ws);
      }
    }
  }

  private send(ws: WebSocket, msg: Partial<WSMessage>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, { type: 'error', message });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        if ((ws as any).isAlive === false) {
          this.unsubscribeAll(ws);
          ws.terminate();
          return;
        }
        (ws as any).isAlive = false;
        ws.ping();
      });
    }, HEARTBEAT_INTERVAL);
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.wss.close();
  }
}
