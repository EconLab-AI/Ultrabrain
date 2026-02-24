/**
 * PM Routes - Project Management API endpoints
 *
 * Provides filtered views (Bugs, Todos, Ideas, Learnings), tag CRUD,
 * item-tag assignment, and backfill functionality.
 */

import express, { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { backfillTags } from '../../../sqlite/import/backfill-tags.js';
import { resetTagCache, detectTags } from '../../AutoLabeler.js';
import type { KnowledgeCompactor } from '../../KnowledgeCompactor.js';

interface TagRow {
  id: number;
  name: string;
  color: string;
  is_system: number;
  created_at_epoch: number;
}

interface ItemTagRow {
  id: number;
  tag_id: number;
  item_type: string;
  item_id: number;
  created_at_epoch: number;
}

interface ObservationWithTags {
  id: number;
  memory_session_id: string;
  project: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  narrative: string | null;
  text: string | null;
  created_at_epoch: number;
  tags: string[];
}

export class PMRoutes extends BaseRouteHandler {
  private compactor: KnowledgeCompactor | null = null;

  constructor(
    private dbManager: DatabaseManager
  ) {
    super();
  }

  /** Set compactor reference for manual trigger endpoint */
  setCompactor(compactor: KnowledgeCompactor): void {
    this.compactor = compactor;
  }

  setupRoutes(app: express.Application): void {
    // PM overview and filtered views
    app.get('/api/pm/overview', this.wrapHandler(this.handleOverview.bind(this)));
    app.get('/api/pm/bugs', this.wrapHandler(this.handleBugs.bind(this)));
    app.get('/api/pm/todos', this.wrapHandler(this.handleTodos.bind(this)));
    app.get('/api/pm/ideas', this.wrapHandler(this.handleIdeas.bind(this)));
    app.get('/api/pm/learnings', this.wrapHandler(this.handleLearnings.bind(this)));

    // Tag CRUD
    app.get('/api/tags', this.wrapHandler(this.handleGetTags.bind(this)));
    app.post('/api/tags', this.wrapHandler(this.handleCreateTag.bind(this)));
    app.delete('/api/tags/:id', this.wrapHandler(this.handleDeleteTag.bind(this)));

    // Item-tag assignment
    app.post('/api/items/:type/:id/tags', this.wrapHandler(this.handleAssignTags.bind(this)));
    app.delete('/api/items/:type/:id/tags/:tagId', this.wrapHandler(this.handleRemoveTag.bind(this)));

    // Backfill
    app.post('/api/pm/backfill-tags', this.wrapHandler(this.handleBackfill.bind(this)));

    // Maintenance
    app.post('/api/pm/compact', this.wrapHandler(this.handleCompact.bind(this)));
    app.post('/api/pm/cleanup-tasks', this.wrapHandler(this.handleCleanupTasks.bind(this)));
    app.post('/api/pm/retag', this.wrapHandler(this.handleRetag.bind(this)));
    app.delete('/api/pm/tasks-bulk', this.wrapHandler(this.handleBulkDeleteTasks.bind(this)));
  }

  // ─── PM Views ──────────────────────────────────────────────────

  private handleOverview(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;

    const projectFilter = project ? 'AND o.project = ?' : '';
    const params = project ? [project] : [];

    // Count observations by tag category
    const bugCount = db.prepare(`
      SELECT COUNT(DISTINCT it.item_id) as count
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
      WHERE t.name = 'bug' AND o.status = 'active' ${projectFilter}
    `).get(...params) as { count: number };

    const todoCount = db.prepare(`
      SELECT COUNT(DISTINCT it.item_id) as count
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
      WHERE t.name = 'todo' AND o.status = 'active' ${projectFilter}
    `).get(...params) as { count: number };

    const ideaCount = db.prepare(`
      SELECT COUNT(DISTINCT it.item_id) as count
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
      WHERE t.name = 'idea' AND o.status = 'active' ${projectFilter}
    `).get(...params) as { count: number };

    const learningCount = db.prepare(`
      SELECT COUNT(DISTINCT it.item_id) as count
      FROM item_tags it
      JOIN tags t ON t.id = it.tag_id
      JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
      WHERE t.name IN ('learning', 'decision') AND o.status = 'active' ${projectFilter}
    `).get(...params) as { count: number };

    // Recent items (last 10 active tagged observations)
    const recent = db.prepare(`
      SELECT DISTINCT o.id, o.type, o.title, o.subtitle, o.project, o.created_at_epoch, o.status,
             GROUP_CONCAT(t.name, ',') as tag_names
      FROM observations o
      JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
      JOIN tags t ON t.id = it.tag_id
      ${project ? 'WHERE o.project = ? AND o.status = \'active\'' : "WHERE o.status = 'active'"}
      GROUP BY o.id
      ORDER BY o.created_at_epoch DESC
      LIMIT 10
    `).all(...params) as any[];

    // Task counts (from kanban tasks table)
    const taskTodoCount = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE status = 'todo' ${project ? 'AND project = ?' : ''}
    `).get(...params) as { count: number };

    const taskInProgressCount = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress' ${project ? 'AND project = ?' : ''}
    `).get(...params) as { count: number };

    res.json({
      bugs: bugCount.count,
      todos: todoCount.count + taskTodoCount.count,
      ideas: ideaCount.count,
      learnings: learningCount.count,
      tasksOpen: taskTodoCount.count,
      tasksInProgress: taskInProgressCount.count,
      recent: recent.map(r => ({
        ...r,
        tags: r.tag_names ? r.tag_names.split(',') : []
      }))
    });
  }

  private handleBugs(req: Request, res: Response): void {
    const items = this.getItemsByTag(req, ['bug', 'fix']);
    res.json({ bugs: items });
  }

  private handleTodos(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;

    // Tagged observations
    const taggedItems = this.getItemsByTag(req, ['todo']);

    // Kanban tasks
    const params = project ? [project] : [];
    const tasks = db.prepare(`
      SELECT * FROM tasks
      ${project ? 'WHERE project = ?' : ''}
      ORDER BY created_at_epoch DESC
    `).all(...params);

    res.json({ observations: taggedItems, tasks });
  }

  private handleIdeas(req: Request, res: Response): void {
    const items = this.getItemsByTag(req, ['idea']);
    res.json({ ideas: items });
  }

  private handleLearnings(req: Request, res: Response): void {
    const items = this.getItemsByTag(req, ['learning', 'decision']);
    res.json({ learnings: items });
  }

  /** Helper: get observations by tag name(s), filtered by status */
  private getItemsByTag(req: Request, tagNames: string[]): ObservationWithTags[] {
    const db = this.dbManager.getSessionStore().db;
    const project = req.query.project as string | undefined;
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const statusFilter = req.query.status as string | undefined; // 'all' shows everything

    const placeholders = tagNames.map(() => '?').join(',');
    const projectClause = project ? 'AND o.project = ?' : '';
    // Default: only show 'active' observations. ?status=all shows everything.
    const statusClause = statusFilter === 'all' ? '' : "AND o.status = 'active'";
    const params = [...tagNames, ...(project ? [project] : []), limit];

    const rows = db.prepare(`
      SELECT DISTINCT o.id, o.memory_session_id, o.project, o.type, o.title, o.subtitle,
             o.narrative, o.text, o.created_at_epoch, o.status, o.relevance_score,
             GROUP_CONCAT(t.name, ',') as tag_names
      FROM observations o
      JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
      JOIN tags t ON t.id = it.tag_id
      WHERE t.name IN (${placeholders}) ${projectClause} ${statusClause}
      GROUP BY o.id
      ORDER BY o.created_at_epoch DESC
      LIMIT ?
    `).all(...params) as any[];

    return rows.map(r => ({
      ...r,
      tags: r.tag_names ? r.tag_names.split(',') : []
    }));
  }

  // ─── Tag CRUD ──────────────────────────────────────────────────

  private handleGetTags(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;

    const tags = db.prepare(`
      SELECT t.*, COUNT(it.id) as usage_count
      FROM tags t
      LEFT JOIN item_tags it ON it.tag_id = t.id
      GROUP BY t.id
      ORDER BY t.is_system DESC, t.name ASC
    `).all() as (TagRow & { usage_count: number })[];

    res.json({ tags });
  }

  private handleCreateTag(req: Request, res: Response): void {
    if (!this.validateRequired(req, res, ['name'])) return;

    const db = this.dbManager.getSessionStore().db;
    const { name, color } = req.body;
    const now = Date.now();

    try {
      const result = db.prepare(
        'INSERT INTO tags (name, color, is_system, created_at_epoch) VALUES (?, ?, 0, ?)'
      ).run(name.toLowerCase().trim(), color || '#6366f1', now);

      resetTagCache();

      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
      logger.info('PM', 'Tag created', { name, id: result.lastInsertRowid });
      res.status(201).json({ tag });
    } catch (error: any) {
      if (error.message?.includes('UNIQUE')) {
        this.badRequest(res, `Tag "${name}" already exists`);
      } else {
        throw error;
      }
    }
  }

  private handleDeleteTag(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const db = this.dbManager.getSessionStore().db;

    // Protect system tags
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow | undefined;
    if (!tag) {
      this.notFound(res, 'Tag not found');
      return;
    }
    if (tag.is_system) {
      this.badRequest(res, 'Cannot delete system tags');
      return;
    }

    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    resetTagCache();

    logger.info('PM', 'Tag deleted', { id, name: tag.name });
    res.json({ deleted: true });
  }

  // ─── Item-Tag Assignment ───────────────────────────────────────

  private handleAssignTags(req: Request, res: Response): void {
    const itemType = req.params.type;
    const itemId = this.parseIntParam(req, res, 'id');
    if (itemId === null) return;

    if (!['observation', 'summary', 'task'].includes(itemType)) {
      this.badRequest(res, 'Invalid item type. Must be observation, summary, or task');
      return;
    }

    if (!this.validateRequired(req, res, ['tagIds'])) return;
    const { tagIds } = req.body as { tagIds: number[] };

    const db = this.dbManager.getSessionStore().db;
    const now = Date.now();
    let assigned = 0;

    const insert = db.prepare(
      'INSERT OR IGNORE INTO item_tags (tag_id, item_type, item_id, created_at_epoch) VALUES (?, ?, ?, ?)'
    );

    for (const tagId of tagIds) {
      const result = insert.run(tagId, itemType, itemId, now);
      if (result.changes > 0) assigned++;
    }

    res.json({ assigned });
  }

  private handleRemoveTag(req: Request, res: Response): void {
    const itemType = req.params.type;
    const itemId = this.parseIntParam(req, res, 'id');
    if (itemId === null) return;

    const tagId = parseInt(req.params.tagId, 10);
    if (isNaN(tagId)) {
      this.badRequest(res, 'Invalid tagId');
      return;
    }

    const db = this.dbManager.getSessionStore().db;
    const result = db.prepare(
      'DELETE FROM item_tags WHERE tag_id = ? AND item_type = ? AND item_id = ?'
    ).run(tagId, itemType, itemId);

    res.json({ removed: result.changes > 0 });
  }

  // ─── Backfill ──────────────────────────────────────────────────

  private handleBackfill(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;

    try {
      const result = backfillTags(db);
      logger.info('PM', 'Backfill complete', result);
      res.json(result);
    } catch (error: any) {
      logger.error('PM', 'Backfill failed', {}, error);
      throw error;
    }
  }

  // ─── Maintenance ───────────────────────────────────────────────

  private async handleCompact(req: Request, res: Response): Promise<void> {
    if (!this.compactor) {
      this.badRequest(res, 'Knowledge compactor not available');
      return;
    }

    try {
      const result = await this.compactor.runCompaction();
      logger.info('PM', 'Manual compaction triggered', result);
      res.json(result);
    } catch (error: any) {
      logger.error('PM', 'Manual compaction failed', {}, error);
      throw error;
    }
  }

  private handleCleanupTasks(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const project = req.body?.project as string | undefined;
    const now = Date.now();

    const projectClause = project ? 'AND project = ?' : '';
    const params = project ? [now, project] : [now];

    // Close all 'todo' tasks (mark as done)
    const closed = db.prepare(`
      UPDATE tasks SET status = 'done', updated_at_epoch = ?
      WHERE status = 'todo' ${projectClause}
    `).run(...params);

    // Delete all 'done' tasks
    const deleted = db.prepare(`
      DELETE FROM tasks WHERE status = 'done' ${projectClause}
    `).run(...(project ? [project] : []));

    logger.info('PM', `Task cleanup: closed ${closed.changes} todo, deleted ${deleted.changes} done`, { project: project || 'all' });
    res.json({ closedTodo: closed.changes, deletedDone: deleted.changes });
  }

  private handleRetag(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    resetTagCache();

    // 1. Remove 'bug' tag from bugfix-type observations (they're fixes, not bugs)
    const bugTagId = (db.prepare("SELECT id FROM tags WHERE name = 'bug'").get() as { id: number } | undefined)?.id;
    const fixTagId = (db.prepare("SELECT id FROM tags WHERE name = 'fix'").get() as { id: number } | undefined)?.id;

    let retagged = 0;
    let removed = 0;

    if (bugTagId) {
      // Remove 'bug' from bugfix observations
      const result = db.prepare(`
        DELETE FROM item_tags
        WHERE tag_id = ? AND item_type = 'observation'
        AND item_id IN (SELECT id FROM observations WHERE type = 'bugfix')
      `).run(bugTagId);
      removed += result.changes;
    }

    if (fixTagId) {
      // Add 'fix' to bugfix observations that don't have it
      const now = Date.now();
      const result = db.prepare(`
        INSERT OR IGNORE INTO item_tags (tag_id, item_type, item_id, created_at_epoch)
        SELECT ?, 'observation', id, ?
        FROM observations WHERE type = 'bugfix'
        AND id NOT IN (SELECT item_id FROM item_tags WHERE tag_id = ? AND item_type = 'observation')
      `).run(fixTagId, now, fixTagId);
      retagged += result.changes;
    }

    // 2. Remove all tags from garbage-titled observations (re-evaluate with improved rules)
    const garbageRemoved = db.prepare(`
      DELETE FROM item_tags
      WHERE item_type = 'observation'
      AND item_id IN (
        SELECT id FROM observations
        WHERE title LIKE 'Read %' OR title LIKE 'Search for %' OR title LIKE 'Find files %'
        OR title LIKE 'Run %' OR title LIKE 'Explore codebase%' OR title LIKE 'Delegate:%'
        OR title LIKE 'Check %endpoint%' OR title LIKE 'Syntax check%' OR title LIKE 'Lint check%'
      )
    `).run();

    // 3. Remove 'feature' tag from 'change' type observations (was over-tagged)
    const featureTagId = (db.prepare("SELECT id FROM tags WHERE name = 'feature'").get() as { id: number } | undefined)?.id;
    let changeUntagged = 0;
    if (featureTagId) {
      const result = db.prepare(`
        DELETE FROM item_tags
        WHERE tag_id = ? AND item_type = 'observation'
        AND item_id IN (SELECT id FROM observations WHERE type = 'change')
      `).run(featureTagId);
      changeUntagged = result.changes;
    }

    logger.info('PM', `Retag complete: removed ${removed} wrong bug tags, retagged ${retagged} as fix, cleaned ${garbageRemoved.changes} garbage, untagged ${changeUntagged} change→feature`);
    res.json({
      bugToFix: { removed, retagged },
      garbageCleaned: garbageRemoved.changes,
      changeUntagged,
    });
  }

  private handleBulkDeleteTasks(req: Request, res: Response): void {
    const db = this.dbManager.getSessionStore().db;
    const { project, status, olderThanDays } = req.body || {};

    const conditions: string[] = [];
    const params: any[] = [];

    if (project) {
      conditions.push('project = ?');
      params.push(project);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (olderThanDays) {
      const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      conditions.push('created_at_epoch < ?');
      params.push(cutoff);
    }

    if (conditions.length === 0) {
      this.badRequest(res, 'At least one filter (project, status, olderThanDays) is required');
      return;
    }

    const where = conditions.join(' AND ');
    const result = db.prepare(`DELETE FROM tasks WHERE ${where}`).run(...params);

    logger.info('PM', `Bulk deleted ${result.changes} tasks`, { project, status, olderThanDays });
    res.json({ deleted: result.changes });
  }
}
