import express, { Request, Response } from 'express';
import { DatabaseManager } from '../../DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

export class CurrentStateRoutes extends BaseRouteHandler {
  constructor(private dbManager: DatabaseManager) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/current-state', this.wrapHandler(this.handleCurrentState.bind(this)));
  }

  private handleCurrentState(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;

    if (!project) {
      this.badRequest(res, 'project parameter required');
      return;
    }

    // Last session
    const lastSession = db.prepare(`
      SELECT id, content_session_id, memory_session_id, started_at_epoch, completed_at_epoch, status,
             (completed_at_epoch - started_at_epoch) / 1000 as duration_seconds
      FROM sdk_sessions
      WHERE project = ?
      ORDER BY started_at_epoch DESC
      LIMIT 1
    `).get(project) as any;

    // Message count for last session
    let messageCount = 0;
    if (lastSession?.memory_session_id) {
      const msgResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations WHERE memory_session_id = ?
      `).get(lastSession.memory_session_id) as { count: number };
      messageCount = msgResult?.count || 0;
    }

    // Recent observations (last 5)
    const recentObservations = db.prepare(`
      SELECT id, type, title, subtitle, created_at_epoch
      FROM observations
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT 5
    `).all(project) as any[];

    // Open tasks
    let taskCounts = { todo: 0, in_progress: 0, done: 0 };
    try {
      taskCounts = {
        todo: (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project = ? AND status = 'todo'`).get(project) as any)?.c || 0,
        in_progress: (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project = ? AND status = 'in_progress'`).get(project) as any)?.c || 0,
        done: (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project = ? AND status = 'done'`).get(project) as any)?.c || 0,
      };
    } catch { /* tasks table may not exist */ }

    // Recent decisions
    let recentDecisions: any[] = [];
    try {
      recentDecisions = db.prepare(`
        SELECT o.id, o.title, o.created_at_epoch
        FROM observations o
        JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
        JOIN tags t ON t.id = it.tag_id
        WHERE t.name = 'decision' AND o.project = ?
        ORDER BY o.created_at_epoch DESC
        LIMIT 3
      `).all(project) as any[];
    } catch { /* tags table may not exist */ }

    // Tag counts
    let tagCounts: Record<string, number> = {};
    try {
      const tagRows = db.prepare(`
        SELECT t.name, COUNT(DISTINCT it.item_id) as count
        FROM item_tags it
        JOIN tags t ON t.id = it.tag_id
        JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
        WHERE o.project = ?
        GROUP BY t.name
      `).all(project) as { name: string; count: number }[];
      for (const row of tagRows) {
        tagCounts[row.name] = row.count;
      }
    } catch { /* tags table may not exist */ }

    // Files changed (extract from recent observations)
    const filesChanged: string[] = [];
    const recentFiles = db.prepare(`
      SELECT files_modified FROM observations
      WHERE project = ? AND files_modified IS NOT NULL AND files_modified != '[]'
      ORDER BY created_at_epoch DESC
      LIMIT 10
    `).all(project) as { files_modified: string }[];

    const seen = new Set<string>();
    for (const row of recentFiles) {
      try {
        const files = JSON.parse(row.files_modified);
        for (const f of files) {
          if (!seen.has(f)) {
            seen.add(f);
            filesChanged.push(f);
          }
          if (filesChanged.length >= 10) break;
        }
      } catch { /* skip malformed JSON */ }
      if (filesChanged.length >= 10) break;
    }

    res.json({
      lastSession: lastSession ? {
        id: lastSession.id,
        startTime: lastSession.started_at_epoch,
        endTime: lastSession.completed_at_epoch,
        duration: lastSession.duration_seconds,
        status: lastSession.status,
        messageCount,
      } : null,
      recentObservations,
      openTasks: taskCounts,
      recentDecisions,
      tagCounts,
      filesChanged,
    });
  }
}
