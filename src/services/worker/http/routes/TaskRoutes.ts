/**
 * Task Routes
 *
 * CRUD endpoints for Kanban tasks and project stats.
 */

import express, { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import {
  importClaudeDesktopSessions,
  getClaudeDesktopSessionsPath,
} from '../../../sqlite/import/claude-desktop.js';
import { backfillKanbanFromExistingObservations } from '../../KanbanPopulator.js';
import { backfillTags } from '../../../sqlite/import/backfill-tags.js';
import { markStaleTasks, bulkCloseTasks, deduplicateTasks, getTaskStats } from '../../TaskLifecycleManager.js';

/**
 * Auto-detect category from title + description text
 */
function detectCategory(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  const rules: [string[], string][] = [
    [['bug', 'crash', 'broken'], 'bug'],
    [['fix', 'hotfix', 'patch'], 'fix'],
    [['feature', 'feat', 'add', 'implement', 'new'], 'feature'],
    [['design', 'mockup', 'wireframe'], 'design'],
    [['ui', 'component', 'layout', 'style', 'css'], 'ui'],
    [['ux', 'usability', 'user experience', 'flow'], 'ux'],
    [['python', 'pip', 'django', 'flask'], 'python'],
    [['deploy', 'docker', 'ci', 'cd', 'pipeline', 'devops', 'infra'], 'devops'],
    [['test', 'spec', 'coverage', 'e2e', 'unit test'], 'testing'],
    [['refactor', 'cleanup', 'reorganize'], 'refactor'],
    [['doc', 'readme', 'documentation'], 'docs'],
    [['perf', 'performance', 'optimize', 'speed'], 'performance'],
    [['security', 'auth', 'vulnerability'], 'security'],
  ];

  for (const [keywords, category] of rules) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'general';
}

export class TaskRoutes extends BaseRouteHandler {
  constructor(
    private dbManager: DatabaseManager
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/tasks', this.wrapHandler(this.handleGetTasks.bind(this)));
    app.post('/api/tasks', this.wrapHandler(this.handleCreateTask.bind(this)));
    app.patch('/api/tasks/:id', this.wrapHandler(this.handleUpdateTask.bind(this)));
    app.delete('/api/tasks/:id', this.wrapHandler(this.handleDeleteTask.bind(this)));
    app.get('/api/projects/stats', this.wrapHandler(this.handleGetProjectStats.bind(this)));
    app.post('/api/tasks/backfill', this.wrapHandler(this.handleBackfillTasks.bind(this)));
    app.post('/api/tasks/bulk-close', this.wrapHandler(this.handleBulkClose.bind(this)));
    app.post('/api/tasks/bulk-stale', this.wrapHandler(this.handleBulkStale.bind(this)));
    app.post('/api/tasks/deduplicate', this.wrapHandler(this.handleDeduplicate.bind(this)));
    app.get('/api/tasks/stats', this.wrapHandler(this.handleTaskStats.bind(this)));
    app.get('/api/claude-desktop/sessions', this.wrapHandler(this.handleGetClaudeDesktopSessions.bind(this)));
    app.get('/api/claude-desktop/sessions/:sessionId/prompts', this.wrapHandler(this.handleGetClaudeDesktopSessionPrompts.bind(this)));
    app.post('/api/claude-desktop/import', this.wrapHandler(this.handleClaudeDesktopImport.bind(this)));
    app.get('/api/claude-desktop/import/check', this.wrapHandler(this.handleClaudeDesktopImportCheck.bind(this)));
  }

  private handleGetTasks(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;

    let rows;
    if (project) {
      rows = db.prepare('SELECT * FROM tasks WHERE project = ? ORDER BY created_at_epoch DESC').all(project);
    } else {
      rows = db.prepare('SELECT * FROM tasks ORDER BY created_at_epoch DESC').all();
    }

    res.json({ tasks: rows });
  }

  private handleCreateTask(req: Request, res: Response): void {
    if (!this.validateRequired(req, res, ['title', 'project'])) return;

    const db = this.dbManager.getSessionStore().db;
    const { title, description, project, priority } = req.body;
    const now = Date.now();
    const category = detectCategory(title, description);

    const result = db.prepare(`
      INSERT INTO tasks (project, title, description, status, priority, category, created_at_epoch, updated_at_epoch)
      VALUES (?, ?, ?, 'todo', ?, ?, ?, ?)
    `).run(project, title, description || null, priority || 'medium', category, now, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

    logger.info('TASKS', 'Task created', { id: result.lastInsertRowid, project, category });
    res.status(201).json({ task });
  }

  private handleUpdateTask(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const db = this.dbManager.getSessionStore().db;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!existing) {
      this.notFound(res, 'Task not found');
      return;
    }

    const { status, title, description, priority } = req.body;
    const now = Date.now();
    const completedAt = status === 'done' ? now : existing.completed_at_epoch;

    // Re-detect category if title or description changed
    const newTitle = title ?? existing.title;
    const newDescription = description ?? existing.description;
    const category = (title !== undefined || description !== undefined)
      ? detectCategory(newTitle, newDescription)
      : existing.category;

    db.prepare(`
      UPDATE tasks
      SET status = ?, title = ?, description = ?, priority = ?, category = ?,
          updated_at_epoch = ?, completed_at_epoch = ?
      WHERE id = ?
    `).run(
      status ?? existing.status,
      newTitle,
      newDescription,
      priority ?? existing.priority,
      category,
      now,
      completedAt,
      id
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json({ task });
  }

  private handleDeleteTask(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const db = this.dbManager.getSessionStore().db;
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    if (result.changes === 0) {
      this.notFound(res, 'Task not found');
      return;
    }

    res.json({ deleted: true });
  }

  private handleBackfillTasks(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'project query parameter required');
      return;
    }

    const db = this.dbManager.getSessionStore().db;

    // Step 1: Ensure all observations are tagged
    const tagResult = backfillTags(db);

    // Step 2: Create kanban tasks from tagged observations
    const created = backfillKanbanFromExistingObservations(db, project);
    res.json({ created, project, tagsApplied: tagResult.tagged });
  }

  private handleGetProjectStats(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const source = req.query.source as string | undefined;

    let obsStats: any[];
    if (source) {
      // Filter projects to only those with sessions of the specified source
      obsStats = db.prepare(`
        SELECT o.project as name,
               COUNT(DISTINCT o.id) as observationCount,
               MAX(o.created_at_epoch) as lastActivity
        FROM observations o
        WHERE o.project IN (
          SELECT DISTINCT s.project FROM sdk_sessions s WHERE s.source = ?
        )
        GROUP BY o.project
      `).all(source) as any[];
    } else {
      obsStats = db.prepare(`
        SELECT project as name,
               COUNT(*) as observationCount,
               MAX(created_at_epoch) as lastActivity
        FROM observations
        GROUP BY project
      `).all() as any[];
    }

    const summaryStats = db.prepare(`
      SELECT project as name,
             COUNT(*) as summaryCount
      FROM session_summaries
      GROUP BY project
    `).all() as any[];

    // Merge obs and summary stats
    const summaryMap = new Map(summaryStats.map((s: any) => [s.name, s.summaryCount]));

    const projects = obsStats.map((p: any) => ({
      name: p.name,
      observationCount: p.observationCount,
      summaryCount: summaryMap.get(p.name) || 0,
      lastActivity: p.lastActivity
    }));

    res.json({ projects });
  }

  private handleBulkClose(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const { project, olderThanDays, status } = req.body;
    const closed = bulkCloseTasks(db, project || null, olderThanDays, status);
    res.json({ closed });
  }

  private handleBulkStale(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const { project, staleDays } = req.body;
    const marked = markStaleTasks(db, project || null, staleDays);
    res.json({ marked });
  }

  private handleDeduplicate(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const { project, dryRun } = req.body;
    const result = deduplicateTasks(db, project || null, dryRun !== false);
    res.json(result);
  }

  private handleTaskStats(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;
    const stats = getTaskStats(db, project || null);
    res.json({ stats });
  }

  private async handleClaudeDesktopImport(req: Request, res: Response): Promise<void> {
    const db = this.dbManager.getSessionStore().db;
    const stats = await importClaudeDesktopSessions(db);
    res.json(stats);
  }

  private handleClaudeDesktopImportCheck(req: Request, res: Response): void {
    const path = getClaudeDesktopSessionsPath();
    res.json({
      available: path !== null,
      path,
    });
  }

  private handleGetClaudeDesktopSessions(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;
    const limit = parseInt(req.query.limit as string, 10) || 100;

    let sessions;
    if (project) {
      sessions = db.prepare(`
        SELECT s.*,
               (SELECT COUNT(*) FROM observations o WHERE o.memory_session_id = s.memory_session_id) as observation_count,
               (SELECT COUNT(*) FROM session_summaries ss WHERE ss.memory_session_id = s.memory_session_id) as summary_count,
               (SELECT COUNT(*) FROM user_prompts up WHERE up.content_session_id = s.content_session_id) as prompt_count
        FROM sdk_sessions s
        WHERE s.source = 'claude-desktop' AND s.project = ?
        ORDER BY s.started_at_epoch DESC
        LIMIT ?
      `).all(project, limit);
    } else {
      sessions = db.prepare(`
        SELECT s.*,
               (SELECT COUNT(*) FROM observations o WHERE o.memory_session_id = s.memory_session_id) as observation_count,
               (SELECT COUNT(*) FROM session_summaries ss WHERE ss.memory_session_id = s.memory_session_id) as summary_count,
               (SELECT COUNT(*) FROM user_prompts up WHERE up.content_session_id = s.content_session_id) as prompt_count
        FROM sdk_sessions s
        WHERE s.source = 'claude-desktop'
        ORDER BY s.started_at_epoch DESC
        LIMIT ?
      `).all(limit);
    }

    res.json({ sessions });
  }

  private handleGetClaudeDesktopSessionPrompts(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const sessionId = req.params.sessionId;

    const prompts = db.prepare(`
      SELECT * FROM user_prompts
      WHERE content_session_id = ?
      ORDER BY prompt_number ASC
    `).all(sessionId);

    res.json({ prompts });
  }
}
