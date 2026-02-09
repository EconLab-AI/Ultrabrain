/**
 * Loop Routes - UltraBrain Loop Management API
 *
 * CRUD endpoints for autonomous loop configuration,
 * iteration tracking, and loop control (start/stop/cancel).
 */

import express, { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { LoopExecutor } from '../../loop/LoopExecutor.js';

interface LoopConfig {
  id: number;
  project: string;
  enabled: number;
  mode: string;
  max_iterations: number;
  task_description: string | null;
  success_criteria: string | null;
  completion_promises: string | null;
  promise_logic: string;
  iteration_context_tokens: number;
  auto_compact_threshold: number;
  created_at_epoch: number;
  updated_at_epoch: number;
}

interface LoopIteration {
  id: number;
  loop_config_id: number;
  iteration_number: number;
  session_id: string | null;
  mode_used: string | null;
  status: string;
  context_injected: string | null;
  observations_count: number;
  key_findings: string | null;
  started_at_epoch: number | null;
  completed_at_epoch: number | null;
}

export class LoopRoutes extends BaseRouteHandler {
  private loopExecutor: LoopExecutor;

  constructor(
    private dbManager: DatabaseManager
  ) {
    super();
    this.loopExecutor = new LoopExecutor(() => this.dbManager.getSessionStore().db);
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/loop/config', this.wrapHandler(this.handleGetConfig.bind(this)));
    app.put('/api/loop/config', this.wrapHandler(this.handleUpdateConfig.bind(this)));
    app.get('/api/loop/status', this.wrapHandler(this.handleGetStatus.bind(this)));
    app.post('/api/loop/start', this.wrapHandler(this.handleStart.bind(this)));
    app.post('/api/loop/stop', this.wrapHandler(this.handleStop.bind(this)));
    app.post('/api/loop/cancel', this.wrapHandler(this.handleCancel.bind(this)));
    app.get('/api/loop/history', this.wrapHandler(this.handleGetHistory.bind(this)));
    app.get('/api/loop/iteration/:id', this.wrapHandler(this.handleGetIteration.bind(this)));
  }

  // ─── Config ───────────────────────────────────────────────────

  private handleGetConfig(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'Missing project query parameter');
      return;
    }

    const db = this.dbManager.getSessionStore().db;
    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    res.json({ config: config || null });
  }

  private handleUpdateConfig(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'Missing project query parameter');
      return;
    }

    const db = this.dbManager.getSessionStore().db;
    const now = Date.now();
    const {
      mode, max_iterations, task_description, success_criteria,
      completion_promises, promise_logic, iteration_context_tokens,
      auto_compact_threshold
    } = req.body;

    const existing = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    if (existing) {
      db.prepare(`
        UPDATE loop_configs SET
          mode = ?, max_iterations = ?, task_description = ?,
          success_criteria = ?, completion_promises = ?, promise_logic = ?,
          iteration_context_tokens = ?, auto_compact_threshold = ?,
          updated_at_epoch = ?
        WHERE project = ?
      `).run(
        mode ?? existing.mode,
        max_iterations ?? existing.max_iterations,
        task_description ?? existing.task_description,
        success_criteria ?? existing.success_criteria,
        completion_promises !== undefined ? JSON.stringify(completion_promises) : existing.completion_promises,
        promise_logic ?? existing.promise_logic,
        iteration_context_tokens ?? existing.iteration_context_tokens,
        auto_compact_threshold ?? existing.auto_compact_threshold,
        now,
        project
      );
    } else {
      db.prepare(`
        INSERT INTO loop_configs (
          project, mode, max_iterations, task_description,
          success_criteria, completion_promises, promise_logic,
          iteration_context_tokens, auto_compact_threshold,
          created_at_epoch, updated_at_epoch
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        project,
        mode || 'adaptive',
        max_iterations || 10,
        task_description || null,
        success_criteria || null,
        completion_promises ? JSON.stringify(completion_promises) : null,
        promise_logic || 'any',
        iteration_context_tokens || 500,
        auto_compact_threshold ?? 0.8,
        now,
        now
      );
    }

    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project);

    logger.info('LOOP', 'Config updated', { project });
    res.json({ config });
  }

  // ─── Status ───────────────────────────────────────────────────

  private handleGetStatus(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'Missing project query parameter');
      return;
    }

    const db = this.dbManager.getSessionStore().db;
    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    if (!config) {
      res.json({ active: false, config: null, iterations: [] });
      return;
    }

    const iterations = db.prepare(
      'SELECT * FROM loop_iterations WHERE loop_config_id = ? ORDER BY iteration_number ASC'
    ).all(config.id) as LoopIteration[];

    const currentIteration = iterations.find(i => i.status === 'running') || null;

    res.json({
      active: config.enabled === 1,
      config,
      iterations,
      currentIteration,
      completedCount: iterations.filter(i => i.status === 'completed').length,
      totalIterations: config.max_iterations,
    });
  }

  // ─── Control ──────────────────────────────────────────────────

  private async handleStart(req: Request, res: Response): Promise<void> {
    if (!this.validateRequired(req, res, ['project', 'task_description'])) return;

    const db = this.dbManager.getSessionStore().db;
    const now = Date.now();
    const {
      project, task_description, success_criteria, mode,
      max_iterations, completion_promises, promise_logic,
      iteration_context_tokens, auto_compact_threshold
    } = req.body;

    // Create or update config with enabled=1
    const existing = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    if (existing) {
      db.prepare(`
        UPDATE loop_configs SET
          enabled = 1, task_description = ?, success_criteria = ?,
          mode = ?, max_iterations = ?,
          completion_promises = ?, promise_logic = ?,
          iteration_context_tokens = ?, auto_compact_threshold = ?,
          updated_at_epoch = ?
        WHERE project = ?
      `).run(
        task_description,
        success_criteria || existing.success_criteria,
        mode || existing.mode,
        max_iterations || existing.max_iterations,
        completion_promises ? JSON.stringify(completion_promises) : existing.completion_promises,
        promise_logic || existing.promise_logic,
        iteration_context_tokens || existing.iteration_context_tokens,
        auto_compact_threshold ?? existing.auto_compact_threshold,
        now,
        project
      );
    } else {
      db.prepare(`
        INSERT INTO loop_configs (
          project, enabled, mode, max_iterations, task_description,
          success_criteria, completion_promises, promise_logic,
          iteration_context_tokens, auto_compact_threshold,
          created_at_epoch, updated_at_epoch
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        project,
        mode || 'adaptive',
        max_iterations || 10,
        task_description,
        success_criteria || null,
        completion_promises ? JSON.stringify(completion_promises) : null,
        promise_logic || 'any',
        iteration_context_tokens || 500,
        auto_compact_threshold ?? 0.8,
        now,
        now
      );
    }

    // Get the config id
    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig;

    // Create first iteration
    db.prepare(`
      INSERT INTO loop_iterations (
        loop_config_id, iteration_number, mode_used, status, started_at_epoch
      ) VALUES (?, 1, ?, 'running', ?)
    `).run(config.id, mode || config.mode, now);

    const iteration = db.prepare(
      'SELECT * FROM loop_iterations WHERE loop_config_id = ? ORDER BY id DESC LIMIT 1'
    ).get(config.id);

    // Actually execute the loop iteration
    this.loopExecutor.execute({
      project,
      taskDescription: task_description,
      iterationNumber: 1,
      configId: config.id,
    });

    logger.info('LOOP', 'Loop started', { project, task: task_description });
    res.status(201).json({ config, iteration, started: true });
  }

  private handleStop(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'Missing project query parameter');
      return;
    }

    const db = this.dbManager.getSessionStore().db;
    const now = Date.now();

    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    if (!config) {
      this.notFound(res, 'No loop config found for project');
      return;
    }

    // Graceful stop: set enabled=0, complete any running iteration
    db.prepare('UPDATE loop_configs SET enabled = 0, updated_at_epoch = ? WHERE project = ?')
      .run(now, project);

    db.prepare(`
      UPDATE loop_iterations SET status = 'completed', completed_at_epoch = ?
      WHERE loop_config_id = ? AND status = 'running'
    `).run(now, config.id);

    logger.info('LOOP', 'Loop stopped (graceful)', { project });
    res.json({ stopped: true });
  }

  private handleCancel(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'Missing project query parameter');
      return;
    }

    const db = this.dbManager.getSessionStore().db;
    const now = Date.now();

    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    if (!config) {
      this.notFound(res, 'No loop config found for project');
      return;
    }

    // Immediate cancel: set enabled=0, mark running iterations as failed
    db.prepare('UPDATE loop_configs SET enabled = 0, updated_at_epoch = ? WHERE project = ?')
      .run(now, project);

    db.prepare(`
      UPDATE loop_iterations SET status = 'failed', completed_at_epoch = ?
      WHERE loop_config_id = ? AND status IN ('running', 'pending')
    `).run(now, config.id);

    logger.info('LOOP', 'Loop cancelled (immediate)', { project });
    res.json({ cancelled: true });
  }

  // ─── History ──────────────────────────────────────────────────

  private handleGetHistory(req: Request, res: Response): void {
    const project = req.query.project as string;
    if (!project) {
      this.badRequest(res, 'Missing project query parameter');
      return;
    }

    const db = this.dbManager.getSessionStore().db;

    // Get all configs for project (including disabled ones)
    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE project = ?'
    ).get(project) as LoopConfig | undefined;

    if (!config) {
      res.json({ config: null, iterations: [] });
      return;
    }

    const iterations = db.prepare(
      'SELECT * FROM loop_iterations WHERE loop_config_id = ? ORDER BY iteration_number DESC'
    ).all(config.id) as LoopIteration[];

    res.json({ config, iterations });
  }

  private handleGetIteration(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const db = this.dbManager.getSessionStore().db;
    const iteration = db.prepare(
      'SELECT * FROM loop_iterations WHERE id = ?'
    ).get(id) as LoopIteration | undefined;

    if (!iteration) {
      this.notFound(res, 'Iteration not found');
      return;
    }

    const config = db.prepare(
      'SELECT * FROM loop_configs WHERE id = ?'
    ).get(iteration.loop_config_id) as LoopConfig;

    res.json({ iteration, config });
  }
}
