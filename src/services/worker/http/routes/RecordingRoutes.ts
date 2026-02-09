/**
 * Recording Routes - Terminal recording API endpoints
 *
 * Manages terminal session recordings in asciicast v2 format.
 * Supports listing, streaming, deleting, and controlling recordings.
 */

import express, { Request, Response } from 'express';
import * as fs from 'fs';
import { logger } from '../../../../utils/logger.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { TerminalRecorder } from '../../terminal/TerminalRecorder.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

interface RecordingRow {
  id: number;
  terminal_session_id: string | null;
  file_path: string;
  duration_ms: number | null;
  size_bytes: number | null;
  observation_ids: string | null;
  created_at_epoch: number;
}

export class RecordingRoutes extends BaseRouteHandler {
  private db: any;
  private recorder: TerminalRecorder;

  constructor(private dbManager: DatabaseManager) {
    super();
    this.db = dbManager.getSessionStore().db;
    this.recorder = new TerminalRecorder();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/recordings', this.wrapHandler(this.handleList.bind(this)));
    app.get('/api/recordings/:id', this.wrapHandler(this.handleStream.bind(this)));
    app.delete('/api/recordings/:id', this.wrapHandler(this.handleDelete.bind(this)));
    app.post('/api/recordings/:terminalId/start', this.wrapHandler(this.handleStart.bind(this)));
    app.post('/api/recordings/:terminalId/stop', this.wrapHandler(this.handleStop.bind(this)));
  }

  private handleList(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;

    let rows: RecordingRow[];
    if (project) {
      rows = this.db.prepare(`
        SELECT r.* FROM terminal_recordings r
        LEFT JOIN terminal_sessions ts ON r.terminal_session_id = ts.id
        WHERE ts.project = ?
        ORDER BY r.created_at_epoch DESC
      `).all(project) as RecordingRow[];
    } else {
      rows = this.db.prepare(
        'SELECT * FROM terminal_recordings ORDER BY created_at_epoch DESC'
      ).all() as RecordingRow[];
    }

    res.json({ recordings: rows });
  }

  private handleStream(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const row = this.db.prepare(
      'SELECT * FROM terminal_recordings WHERE id = ?'
    ).get(id) as RecordingRow | undefined;

    if (!row) {
      this.notFound(res, 'Recording not found');
      return;
    }

    if (!fs.existsSync(row.file_path)) {
      this.notFound(res, 'Recording file not found on disk');
      return;
    }

    res.setHeader('Content-Type', 'application/x-asciicast');
    res.setHeader('Content-Disposition', `inline; filename="recording-${id}.cast"`);
    const stream = fs.createReadStream(row.file_path);
    stream.pipe(res);
  }

  private handleDelete(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const row = this.db.prepare(
      'SELECT * FROM terminal_recordings WHERE id = ?'
    ).get(id) as RecordingRow | undefined;

    if (!row) {
      this.notFound(res, 'Recording not found');
      return;
    }

    // Delete file from disk
    if (fs.existsSync(row.file_path)) {
      try {
        fs.unlinkSync(row.file_path);
      } catch (err) {
        logger.warn('RECORDING', `Failed to delete recording file: ${row.file_path}`);
      }
    }

    // Delete from database
    this.db.prepare('DELETE FROM terminal_recordings WHERE id = ?').run(id);
    res.json({ success: true });
  }

  private handleStart(req: Request, res: Response): void {
    const { terminalId } = req.params;
    const { cols, rows: termRows } = req.body || {};

    const actualCols = cols || 80;
    const actualRows = termRows || 24;

    if (this.recorder.isRecording(terminalId)) {
      this.badRequest(res, 'Already recording this terminal');
      return;
    }

    const filePath = this.recorder.startRecording(terminalId, actualCols, actualRows);

    // Create DB record
    this.db.prepare(`
      INSERT INTO terminal_recordings (terminal_session_id, file_path, created_at_epoch)
      VALUES (?, ?, ?)
    `).run(terminalId, filePath, Date.now());

    const row = this.db.prepare(
      'SELECT * FROM terminal_recordings WHERE file_path = ?'
    ).get(filePath) as RecordingRow;

    res.status(201).json({ recording: row });
  }

  private handleStop(req: Request, res: Response): void {
    const { terminalId } = req.params;

    const result = this.recorder.stopRecording(terminalId);
    if (!result) {
      this.notFound(res, 'No active recording for this terminal');
      return;
    }

    // Update DB record with duration and size
    this.db.prepare(`
      UPDATE terminal_recordings
      SET duration_ms = ?, size_bytes = ?
      WHERE file_path = ?
    `).run(result.durationMs, result.sizeBytes, result.filePath);

    const row = this.db.prepare(
      'SELECT * FROM terminal_recordings WHERE file_path = ?'
    ).get(result.filePath) as RecordingRow;

    res.json({ recording: row });
  }

  getRecorder(): TerminalRecorder {
    return this.recorder;
  }
}
