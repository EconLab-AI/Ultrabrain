import { useState, useEffect, useRef, useCallback } from 'react';

export interface WSMessage {
  type: string;
  terminalId?: string;
  data?: string;
  shell?: string;
  cwd?: string;
  project?: string;
  cols?: number;
  rows?: number;
  metadata?: any;
  terminals?: any[];
  message?: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useTerminalWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptRef = useRef(0);
  const messageHandlersRef = useRef<Map<string, Set<(msg: WSMessage) => void>>>(new Map());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);

    ws.onopen = () => {
      setConnectionState('connected');
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const handlers = messageHandlersRef.current.get(msg.type);
        if (handlers) {
          handlers.forEach(handler => handler(msg));
        }
        const allHandlers = messageHandlersRef.current.get('*');
        if (allHandlers) {
          allHandlers.forEach(handler => handler(msg));
        }
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      reconnectAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setConnectionState('error');
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const on = useCallback((type: string, handler: (msg: WSMessage) => void) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, new Set());
    }
    messageHandlersRef.current.get(type)!.add(handler);
    return () => {
      messageHandlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, send, on, connectionState };
}
