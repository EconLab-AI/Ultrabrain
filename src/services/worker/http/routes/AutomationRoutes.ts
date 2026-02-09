/**
 * AutomationRoutes - HTTP API for automation job management
 *
 * CRUD for jobs, manual triggers, run history, and webhook receiver.
 */

import express, { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { AutomationManager } from '../../automation/AutomationManager.js';

export class AutomationRoutes extends BaseRouteHandler {
  constructor(
    private automationManager: AutomationManager
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    // Jobs CRUD
    app.get('/api/automation/jobs', this.wrapHandler(this.handleListJobs.bind(this)));
    app.post('/api/automation/jobs', this.wrapHandler(this.handleCreateJob.bind(this)));
    app.get('/api/automation/jobs/:id', this.wrapHandler(this.handleGetJob.bind(this)));
    app.put('/api/automation/jobs/:id', this.wrapHandler(this.handleUpdateJob.bind(this)));
    app.delete('/api/automation/jobs/:id', this.wrapHandler(this.handleDeleteJob.bind(this)));

    // Job actions
    app.post('/api/automation/jobs/:id/run', this.wrapHandler(this.handleRunJob.bind(this)));
    app.post('/api/automation/jobs/:id/enable', this.wrapHandler(this.handleEnableJob.bind(this)));
    app.post('/api/automation/jobs/:id/disable', this.wrapHandler(this.handleDisableJob.bind(this)));

    // Runs
    app.get('/api/automation/runs', this.wrapHandler(this.handleListRuns.bind(this)));

    // Webhook receiver
    app.post('/api/webhooks/:path', this.wrapHandler(this.handleWebhook.bind(this)));
  }

  // ─── Jobs CRUD ──────────────────────────────────────────────

  private handleListJobs(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const jobs = this.automationManager.getJobs(project);
    res.json({ jobs });
  }

  private handleCreateJob(req: Request, res: Response): void {
    if (!this.validateRequired(req, res, ['name', 'type', 'project', 'task_description'])) return;

    const validTypes = ['cron', 'webhook', 'trigger', 'one-time'];
    if (!validTypes.includes(req.body.type)) {
      this.badRequest(res, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
      return;
    }

    if (req.body.type === 'cron' && !req.body.cron_expression) {
      this.badRequest(res, 'cron_expression is required for cron jobs');
      return;
    }

    const job = this.automationManager.createJob(req.body);
    res.status(201).json({ job });
  }

  private handleGetJob(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const job = this.automationManager.getJob(id);
    if (!job) {
      this.notFound(res, 'Job not found');
      return;
    }

    res.json({ job });
  }

  private handleUpdateJob(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const job = this.automationManager.updateJob(id, req.body);
    if (!job) {
      this.notFound(res, 'Job not found');
      return;
    }

    res.json({ job });
  }

  private handleDeleteJob(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const deleted = this.automationManager.deleteJob(id);
    if (!deleted) {
      this.notFound(res, 'Job not found');
      return;
    }

    res.json({ deleted: true });
  }

  // ─── Job Actions ────────────────────────────────────────────

  private async handleRunJob(req: Request, res: Response): Promise<void> {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const job = this.automationManager.getJob(id);
    if (!job) {
      this.notFound(res, 'Job not found');
      return;
    }

    const run = await this.automationManager.executeJob(id, 'manual');
    res.status(201).json({ run });
  }

  private handleEnableJob(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const job = this.automationManager.enableJob(id);
    if (!job) {
      this.notFound(res, 'Job not found');
      return;
    }

    res.json({ job });
  }

  private handleDisableJob(req: Request, res: Response): void {
    const id = this.parseIntParam(req, res, 'id');
    if (id === null) return;

    const job = this.automationManager.disableJob(id);
    if (!job) {
      this.notFound(res, 'Job not found');
      return;
    }

    res.json({ job });
  }

  // ─── Runs ───────────────────────────────────────────────────

  private handleListRuns(req: Request, res: Response): void {
    const filters: { job_id?: number; status?: string } = {};

    if (req.query.job_id) {
      const jobId = parseInt(req.query.job_id as string, 10);
      if (!isNaN(jobId)) filters.job_id = jobId;
    }
    if (req.query.status) {
      filters.status = req.query.status as string;
    }

    const runs = this.automationManager.getRuns(filters);
    res.json({ runs });
  }

  // ─── Webhook Receiver ──────────────────────────────────────

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    const webhookPath = req.params.path;
    const db = (this.automationManager as any).getDb();

    const job = db.prepare(
      'SELECT * FROM automation_jobs WHERE webhook_path = ? AND enabled = 1'
    ).get(webhookPath) as any;

    if (!job) {
      this.notFound(res, 'Webhook not found or disabled');
      return;
    }

    // Validate signature if secret exists
    if (job.webhook_secret) {
      const signature = (req.headers['x-hub-signature-256'] || req.headers['x-webhook-signature']) as string;
      if (!signature) {
        res.status(401).json({ error: 'Missing signature header' });
        return;
      }

      const payload = JSON.stringify(req.body);
      const webhookManager = this.automationManager.getWebhookManager();
      if (!webhookManager.validateSignature(payload, signature, job.webhook_secret)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const run = await this.automationManager.executeJob(job.id, 'webhook', req.body);
    res.status(200).json({ received: true, run_id: run?.id });
  }
}
