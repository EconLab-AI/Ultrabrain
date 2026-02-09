/**
 * AutomationManager - Core scheduler for automation jobs
 *
 * Manages cron-based, webhook-based, trigger-based, and one-time automation jobs.
 * Spawns Claude sessions to execute tasks, tracking runs and their outcomes.
 */

import cron from 'node-cron';
import { spawn } from 'child_process';
import { platform } from 'os';
import { logger } from '../../../utils/logger.js';
import { TriggerEvaluator } from './TriggerEvaluator.js';
import { WebhookManager } from './WebhookManager.js';
import { resolveProjectCwd } from '../utils/project-cwd.js';

interface AutomationJob {
  id: number;
  name: string;
  type: string;
  project: string;
  enabled: number;
  cron_expression: string | null;
  timezone: string;
  webhook_path: string | null;
  webhook_secret: string | null;
  trigger_event: string | null;
  trigger_conditions: string | null;
  task_description: string;
  working_directory: string | null;
  model: string;
  permission_mode: string;
  max_runtime_seconds: number;
  retry_on_failure: number;
  max_retries: number;
  last_run_at_epoch: number | null;
  next_run_at_epoch: number | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_at_epoch: number;
  updated_at_epoch: number;
}

interface AutomationRun {
  id: number;
  job_id: number;
  status: string;
  triggered_by: string;
  trigger_payload: string | null;
  content_session_id: string | null;
  terminal_session_id: string | null;
  output_log: string | null;
  error_message: string | null;
  observations_created: number;
  started_at_epoch: number;
  completed_at_epoch: number | null;
  duration_ms: number | null;
  retry_number: number;
}

export class AutomationManager {
  private getDb: () => any;
  private cronTasks: Map<number, any> = new Map();
  private triggerEvaluator: TriggerEvaluator;
  private webhookManager: WebhookManager;

  constructor(getDb: () => any) {
    this.getDb = getDb;
    this.triggerEvaluator = new TriggerEvaluator();
    this.webhookManager = new WebhookManager;
  }

  /**
   * Initialize: load all enabled jobs from DB and schedule cron jobs
   */
  init(): void {
    const db = this.getDb();
    const jobs = db.prepare(
      'SELECT * FROM automation_jobs WHERE enabled = 1 AND type = ?'
    ).all('cron') as AutomationJob[];

    for (const job of jobs) {
      this.scheduleJob(job.id);
    }

    logger.info('WORKER', `Initialized ${jobs.length} cron jobs`);
  }

  /**
   * Schedule a cron job by its ID
   */
  scheduleJob(jobId: number): void {
    const db = this.getDb();
    const job = db.prepare('SELECT * FROM automation_jobs WHERE id = ?').get(jobId) as AutomationJob | undefined;
    if (!job || !job.cron_expression || job.type !== 'cron') return;

    // Unschedule existing if any
    this.unscheduleJob(jobId);

    if (!cron.validate(job.cron_expression)) {
      logger.error('WORKER', `Invalid cron expression for job ${jobId}: ${job.cron_expression}`);
      return;
    }

    const task = cron.schedule(job.cron_expression, () => {
      this.executeJob(jobId, 'cron').catch(err => {
        logger.error('WORKER', `Cron execution failed for job ${jobId}`, {}, err as Error);
      });
    }, { timezone: job.timezone || 'UTC' });

    this.cronTasks.set(jobId, task);
    logger.debug('WORKER', `Scheduled cron job ${jobId}: ${job.cron_expression}`);
  }

  /**
   * Unschedule a cron job
   */
  unscheduleJob(jobId: number): void {
    const task = this.cronTasks.get(jobId);
    if (task) {
      task.stop();
      this.cronTasks.delete(jobId);
    }
  }

  /**
   * Execute a job: create run record, spawn Claude session, update status
   */
  async executeJob(jobId: number, triggeredBy: string, triggerPayload?: any): Promise<AutomationRun | null> {
    const db = this.getDb();
    const job = db.prepare('SELECT * FROM automation_jobs WHERE id = ?').get(jobId) as AutomationJob | undefined;

    if (!job) {
      logger.error('WORKER', `Job ${jobId} not found`);
      return null;
    }

    const now = Date.now();

    // Create run record
    const result = db.prepare(`
      INSERT INTO automation_runs (
        job_id, status, triggered_by, trigger_payload,
        started_at_epoch, retry_number
      ) VALUES (?, 'running', ?, ?, ?, 0)
    `).run(jobId, triggeredBy, triggerPayload ? JSON.stringify(triggerPayload) : null, now);

    const runId = Number(result.lastInsertRowid);

    // Update job stats
    db.prepare(`
      UPDATE automation_jobs SET
        last_run_at_epoch = ?,
        total_runs = total_runs + 1,
        updated_at_epoch = ?
      WHERE id = ?
    `).run(now, now, jobId);

    // Resolve working directory
    const cwd = job.working_directory || resolveProjectCwd(db, job.project);
    if (!cwd) {
      this.completeRun(runId, jobId, 'failed', null, 'Could not resolve working directory');
      return this.getRun(runId) || null;
    }

    // Spawn Claude session
    try {
      await this.spawnClaudeSession(job, runId, cwd);
    } catch (err) {
      this.completeRun(runId, jobId, 'failed', null, (err as Error).message);
    }

    return this.getRun(runId) || null;
  }

  /**
   * Spawn a Claude session to execute the job's task
   */
  private async spawnClaudeSession(job: AutomationJob, runId: number, cwd: string): Promise<void> {
    const prompt = `[UltraBrain Automation - Job: ${job.name}]\n\n${job.task_description}`;

    const modelFlag = job.model && job.model !== 'sonnet' ? ['--model', job.model] : [];
    const permFlag = job.permission_mode === 'dangerously-skip-permissions'
      ? ['--dangerously-skip-permissions']
      : ['--allowedTools', ''];

    if (platform() === 'darwin') {
      const escapedCwd = cwd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      const modelStr = modelFlag.length ? ` ${modelFlag.join(' ')}` : '';
      const permStr = permFlag[0] === '--dangerously-skip-permissions'
        ? ' --dangerously-skip-permissions'
        : '';

      const appleScript = `tell application "Terminal"
  activate
  do script "cd \\"${escapedCwd}\\" && claude${permStr}${modelStr} -p \\"${escapedPrompt}\\""
end tell`;

      return new Promise<void>((resolve, reject) => {
        const child = spawn('osascript', ['-'], { stdio: ['pipe', 'pipe', 'pipe'] });
        child.stdin.write(appleScript);
        child.stdin.end();

        child.on('exit', (code) => {
          if (code !== 0) {
            logger.warn('WORKER', `Terminal.app failed for run ${runId}, falling back to headless`);
            this.spawnHeadless(cwd, prompt, modelFlag, permFlag, job, runId)
              .then(resolve)
              .catch(reject);
          } else {
            logger.info('WORKER', `Terminal.app opened for job ${job.name} (run ${runId})`);
            // Mark as running - completion tracked externally
            resolve();
          }
        });
      });
    } else {
      return this.spawnHeadless(cwd, prompt, modelFlag, permFlag, job, runId);
    }
  }

  private spawnHeadless(
    cwd: string, prompt: string, modelFlag: string[], permFlag: string[],
    job: AutomationJob, runId: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const args = [...permFlag.filter(Boolean), ...modelFlag, '-p', prompt];
      const child = spawn('claude', args, {
        cwd,
        stdio: 'pipe',
        detached: true,
      });

      let outputLog = '';

      child.stdout?.on('data', (data: Buffer) => {
        outputLog += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        outputLog += data.toString();
      });

      // Set max runtime timeout
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        this.completeRun(runId, job.id, 'failed', outputLog, 'Max runtime exceeded');
      }, (job.max_runtime_seconds || 3600) * 1000);

      child.on('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          this.completeRun(runId, job.id, 'completed', outputLog);
        } else {
          this.completeRun(runId, job.id, 'failed', outputLog, `Process exited with code ${code}`);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        this.completeRun(runId, job.id, 'failed', outputLog, err.message);
        reject(err);
      });

      child.unref();
      resolve();
    });
  }

  /**
   * Complete a run: update status, duration, and job stats
   */
  private completeRun(
    runId: number, jobId: number, status: 'completed' | 'failed',
    outputLog: string | null, errorMessage?: string
  ): void {
    const db = this.getDb();
    const now = Date.now();

    const run = db.prepare('SELECT started_at_epoch FROM automation_runs WHERE id = ?').get(runId) as { started_at_epoch: number } | undefined;
    const duration = run ? now - run.started_at_epoch : null;

    db.prepare(`
      UPDATE automation_runs SET
        status = ?, output_log = ?, error_message = ?,
        completed_at_epoch = ?, duration_ms = ?
      WHERE id = ?
    `).run(status, outputLog, errorMessage || null, now, duration, runId);

    // Update job counters
    if (status === 'completed') {
      db.prepare('UPDATE automation_jobs SET successful_runs = successful_runs + 1, updated_at_epoch = ? WHERE id = ?').run(now, jobId);
    } else {
      db.prepare('UPDATE automation_jobs SET failed_runs = failed_runs + 1, updated_at_epoch = ? WHERE id = ?').run(now, jobId);
    }

    logger.info('WORKER', `Run ${runId} ${status}`, { jobId, duration });
  }

  /**
   * Evaluate an event against all trigger-type jobs
   */
  evaluateTrigger(eventType: string, eventData: any): void {
    const db = this.getDb();
    const jobs = db.prepare(
      "SELECT * FROM automation_jobs WHERE enabled = 1 AND type = 'trigger'"
    ).all() as AutomationJob[];

    for (const job of jobs) {
      let conditions: Record<string, any> = {};
      try {
        conditions = job.trigger_conditions ? JSON.parse(job.trigger_conditions) : {};
      } catch {
        continue;
      }

      if (this.triggerEvaluator.evaluate(conditions, { type: eventType, data: eventData })) {
        logger.info('WORKER', `Trigger matched for job ${job.id}: ${job.name}`);
        this.executeJob(job.id, 'trigger', { eventType, eventData }).catch(err => {
          logger.error('WORKER', `Trigger execution failed for job ${job.id}`, {}, err as Error);
        });
      }
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────

  getJobs(project?: string): AutomationJob[] {
    const db = this.getDb();
    if (project) {
      return db.prepare('SELECT * FROM automation_jobs WHERE project = ? ORDER BY created_at_epoch DESC').all(project) as AutomationJob[];
    }
    return db.prepare('SELECT * FROM automation_jobs ORDER BY created_at_epoch DESC').all() as AutomationJob[];
  }

  getJob(id: number): AutomationJob | undefined {
    const db = this.getDb();
    return db.prepare('SELECT * FROM automation_jobs WHERE id = ?').get(id) as AutomationJob | undefined;
  }

  createJob(data: {
    name: string;
    type: string;
    project: string;
    cron_expression?: string;
    timezone?: string;
    trigger_event?: string;
    trigger_conditions?: any;
    task_description: string;
    working_directory?: string;
    model?: string;
    permission_mode?: string;
    max_runtime_seconds?: number;
    retry_on_failure?: boolean;
    max_retries?: number;
  }): AutomationJob {
    const db = this.getDb();
    const now = Date.now();

    let webhookPath: string | null = null;
    let webhookSecret: string | null = null;

    if (data.type === 'webhook') {
      webhookPath = this.webhookManager.generateWebhookPath();
      webhookSecret = this.webhookManager.generateSecret();
    }

    const triggerConditions = data.trigger_conditions
      ? (typeof data.trigger_conditions === 'string' ? data.trigger_conditions : JSON.stringify(data.trigger_conditions))
      : null;

    const result = db.prepare(`
      INSERT INTO automation_jobs (
        name, type, project, enabled,
        cron_expression, timezone,
        webhook_path, webhook_secret,
        trigger_event, trigger_conditions,
        task_description, working_directory,
        model, permission_mode,
        max_runtime_seconds, retry_on_failure, max_retries,
        created_at_epoch, updated_at_epoch
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.type,
      data.project,
      data.cron_expression || null,
      data.timezone || 'UTC',
      webhookPath,
      webhookSecret,
      data.trigger_event || null,
      triggerConditions,
      data.task_description,
      data.working_directory || null,
      data.model || 'sonnet',
      data.permission_mode || 'plan',
      data.max_runtime_seconds || 3600,
      data.retry_on_failure ? 1 : 0,
      data.max_retries || 0,
      now,
      now
    );

    const jobId = Number(result.lastInsertRowid);
    const job = this.getJob(jobId)!;

    if (job.type === 'cron' && job.cron_expression) {
      this.scheduleJob(jobId);
    }

    logger.info('WORKER', `Created job ${jobId}: ${data.name} (${data.type})`);
    return job;
  }

  updateJob(id: number, data: Partial<{
    name: string;
    type: string;
    project: string;
    cron_expression: string;
    timezone: string;
    trigger_event: string;
    trigger_conditions: any;
    task_description: string;
    working_directory: string;
    model: string;
    permission_mode: string;
    max_runtime_seconds: number;
    retry_on_failure: boolean;
    max_retries: number;
  }>): AutomationJob | undefined {
    const db = this.getDb();
    const existing = this.getJob(id);
    if (!existing) return undefined;

    const now = Date.now();

    const triggerConditions = data.trigger_conditions !== undefined
      ? (typeof data.trigger_conditions === 'string' ? data.trigger_conditions : JSON.stringify(data.trigger_conditions))
      : existing.trigger_conditions;

    db.prepare(`
      UPDATE automation_jobs SET
        name = ?, type = ?, project = ?,
        cron_expression = ?, timezone = ?,
        trigger_event = ?, trigger_conditions = ?,
        task_description = ?, working_directory = ?,
        model = ?, permission_mode = ?,
        max_runtime_seconds = ?, retry_on_failure = ?, max_retries = ?,
        updated_at_epoch = ?
      WHERE id = ?
    `).run(
      data.name ?? existing.name,
      data.type ?? existing.type,
      data.project ?? existing.project,
      data.cron_expression ?? existing.cron_expression,
      data.timezone ?? existing.timezone,
      data.trigger_event ?? existing.trigger_event,
      triggerConditions,
      data.task_description ?? existing.task_description,
      data.working_directory ?? existing.working_directory,
      data.model ?? existing.model,
      data.permission_mode ?? existing.permission_mode,
      data.max_runtime_seconds ?? existing.max_runtime_seconds,
      data.retry_on_failure !== undefined ? (data.retry_on_failure ? 1 : 0) : existing.retry_on_failure,
      data.max_retries ?? existing.max_retries,
      now,
      id
    );

    // Reschedule cron if needed
    const updated = this.getJob(id)!;
    if (updated.type === 'cron' && updated.enabled) {
      this.scheduleJob(id);
    } else {
      this.unscheduleJob(id);
    }

    logger.info('WORKER', `Updated job ${id}`);
    return updated;
  }

  deleteJob(id: number): boolean {
    const db = this.getDb();
    this.unscheduleJob(id);
    const result = db.prepare('DELETE FROM automation_jobs WHERE id = ?').run(id);
    if (result.changes > 0) {
      logger.info('WORKER', `Deleted job ${id}`);
      return true;
    }
    return false;
  }

  enableJob(id: number): AutomationJob | undefined {
    const db = this.getDb();
    const now = Date.now();
    db.prepare('UPDATE automation_jobs SET enabled = 1, updated_at_epoch = ? WHERE id = ?').run(now, id);

    const job = this.getJob(id);
    if (job?.type === 'cron') {
      this.scheduleJob(id);
    }
    return job;
  }

  disableJob(id: number): AutomationJob | undefined {
    const db = this.getDb();
    const now = Date.now();
    db.prepare('UPDATE automation_jobs SET enabled = 0, updated_at_epoch = ? WHERE id = ?').run(now, id);
    this.unscheduleJob(id);
    return this.getJob(id);
  }

  getRuns(filters?: { job_id?: number; status?: string }): AutomationRun[] {
    const db = this.getDb();
    let sql = 'SELECT * FROM automation_runs';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.job_id) {
      conditions.push('job_id = ?');
      params.push(filters.job_id);
    }
    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY started_at_epoch DESC LIMIT 200';

    return db.prepare(sql).all(...params) as AutomationRun[];
  }

  getRun(id: number): AutomationRun | undefined {
    const db = this.getDb();
    return db.prepare('SELECT * FROM automation_runs WHERE id = ?').get(id) as AutomationRun | undefined;
  }

  getWebhookManager(): WebhookManager {
    return this.webhookManager;
  }

  /**
   * Stop all cron tasks on shutdown
   */
  shutdown(): void {
    for (const [jobId, task] of this.cronTasks) {
      task.stop();
      logger.debug('WORKER', `Stopped cron task for job ${jobId}`);
    }
    this.cronTasks.clear();
    logger.info('WORKER', 'Shutdown complete');
  }
}
