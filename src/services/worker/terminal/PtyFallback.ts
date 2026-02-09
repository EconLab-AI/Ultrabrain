import { spawn, ChildProcess } from 'child_process';

export class PtyFallback {
  private process: ChildProcess;
  private dataCallbacks: ((data: string) => void)[] = [];
  private exitCallbacks: ((exitCode: number) => void)[] = [];
  pid: number;

  constructor(shell: string, args: string[], options: { cols: number; rows: number; cwd: string; env: Record<string, string> }) {
    this.process = spawn(shell, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.pid = this.process.pid!;

    this.process.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      this.dataCallbacks.forEach(cb => cb(str));
    });
    this.process.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      this.dataCallbacks.forEach(cb => cb(str));
    });
    this.process.on('exit', (code) => {
      this.exitCallbacks.forEach(cb => cb(code ?? 1));
    });
  }

  onData(callback: (data: string) => void): void {
    this.dataCallbacks.push(callback);
  }

  onExit(callback: (exitCode: number) => void): void {
    this.exitCallbacks.push(callback);
  }

  write(data: string): void {
    this.process.stdin?.write(data);
  }

  resize(_cols: number, _rows: number): void {
    // No-op for child_process fallback
  }

  kill(): void {
    this.process.kill();
  }

  get processName(): string {
    return this.process.spawnfile || 'unknown';
  }
}
