/**
 * TerminalRecorder - Records terminal output in asciicast v2 format
 *
 * Produces .cast files compatible with asciinema players.
 * Each recording consists of a JSON header line followed by event lines.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SettingsDefaultsManager } from '../../../shared/SettingsDefaultsManager.js';

export class TerminalRecorder {
  private streams: Map<string, { fd: number; startTime: number; filePath: string }> = new Map();

  private getRecordingsDir(): string {
    const dir = path.join(SettingsDefaultsManager.get('ULTRABRAIN_DATA_DIR'), 'recordings');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  startRecording(terminalId: string, cols: number, rows: number): string {
    const filePath = path.join(this.getRecordingsDir(), `${terminalId}-${Date.now()}.cast`);
    const header = JSON.stringify({
      version: 2,
      width: cols,
      height: rows,
      timestamp: Math.floor(Date.now() / 1000),
      env: { SHELL: process.env.SHELL || '/bin/bash', TERM: 'xterm-256color' }
    });

    fs.writeFileSync(filePath, header + '\n');
    const fd = fs.openSync(filePath, 'a');
    this.streams.set(terminalId, { fd, startTime: Date.now(), filePath });
    return filePath;
  }

  recordOutput(terminalId: string, data: string): void {
    const stream = this.streams.get(terminalId);
    if (!stream) return;

    const elapsed = (Date.now() - stream.startTime) / 1000;
    const event = JSON.stringify([elapsed, 'o', data]);
    fs.writeSync(stream.fd, event + '\n');
  }

  recordInput(terminalId: string, data: string): void {
    const stream = this.streams.get(terminalId);
    if (!stream) return;

    const elapsed = (Date.now() - stream.startTime) / 1000;
    const event = JSON.stringify([elapsed, 'i', data]);
    fs.writeSync(stream.fd, event + '\n');
  }

  stopRecording(terminalId: string): { filePath: string; durationMs: number; sizeBytes: number } | null {
    const stream = this.streams.get(terminalId);
    if (!stream) return null;

    fs.closeSync(stream.fd);
    this.streams.delete(terminalId);

    const stats = fs.statSync(stream.filePath);
    return {
      filePath: stream.filePath,
      durationMs: Date.now() - stream.startTime,
      sizeBytes: stats.size
    };
  }

  isRecording(terminalId: string): boolean {
    return this.streams.has(terminalId);
  }

  stopAll(): void {
    for (const [id] of this.streams) {
      this.stopRecording(id);
    }
  }
}
