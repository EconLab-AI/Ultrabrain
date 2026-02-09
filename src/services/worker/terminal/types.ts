export interface TerminalMetadata {
  id: string;
  shell: string;
  cwd: string;
  project?: string;
  cols: number;
  rows: number;
  createdAt: number;
  isAlive: boolean;
}

export interface ManagedTerminal {
  id: string;
  pty: any;
  metadata: TerminalMetadata;
  scrollback: string[];
  subscribers: Set<any>;
}

export interface WSMessage {
  type: 'create' | 'input' | 'output' | 'resize' | 'destroy' | 'subscribe' | 'list' | 'created' | 'destroyed' | 'terminals' | 'error';
  terminalId?: string;
  data?: string;
  shell?: string;
  cwd?: string;
  project?: string;
  cols?: number;
  rows?: number;
  metadata?: TerminalMetadata;
  terminals?: TerminalMetadata[];
  message?: string;
}
