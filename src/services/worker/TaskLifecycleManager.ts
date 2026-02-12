/**
 * TaskLifecycleManager — Auto-Resolve, Deduplicate, Stale Detection
 *
 * Hooks into the observation pipeline to:
 * 1. Auto-resolve open tasks when completion signals are detected
 * 2. Prevent duplicate task creation via title similarity
 * 3. Mark stale tasks for cleanup
 */

import { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';

// Completion signal words in observation titles/narratives
const COMPLETION_SIGNALS = /\b(fixed|resolved|implemented|completed|done|closed|merged|shipped|deployed)\b/i;

// Types that signal work was done
const COMPLETION_TYPES = new Set(['bugfix', 'change']);

// Pattern to extract direct task references like "Fixed bug #42" or "task #123"
const TASK_REF_PATTERN = /#(\d+)/g;

/**
 * Tokenize a string for Jaccard similarity comparison.
 * Lowercase, split on non-alphanumeric, filter tokens with length > 2.
 */
function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length > 2)
  );
}

/**
 * Jaccard similarity between two token sets.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

interface OpenTask {
  id: number;
  title: string;
  project: string;
}

/**
 * Auto-resolve open tasks when a new observation signals work completion.
 *
 * Called after populateKanbanFromObservation() in ResponseProcessor.
 * When a new observation arrives that signals work completion,
 * find and close matching open tasks.
 */
export function processCompletionSignals(
  db: Database,
  obsId: number,
  obs: { type: string; title?: string | null; narrative?: string | null },
  project: string
): number {
  const obsTitle = obs.title || '';
  const obsNarrative = obs.narrative || '';
  const obsText = `${obsTitle} ${obsNarrative}`;

  // Check if this observation is a completion signal
  const isCompletionType = COMPLETION_TYPES.has(obs.type);
  const hasCompletionWords = COMPLETION_SIGNALS.test(obsText);

  if (!isCompletionType && !hasCompletionWords) return 0;

  const now = Date.now();
  let resolved = 0;

  // Tier 1: Direct task ID references (e.g. "Fixed bug #42")
  const refs = [...obsText.matchAll(TASK_REF_PATTERN)];
  if (refs.length > 0) {
    const resolveById = db.prepare(
      `UPDATE tasks SET status = 'done', completed_at_epoch = ?, updated_at_epoch = ?
       WHERE id = ? AND status != 'done' AND project = ?`
    );
    for (const match of refs) {
      const taskId = parseInt(match[1], 10);
      const result = resolveById.run(now, now, taskId, project);
      if (result.changes > 0) {
        resolved++;
        logger.debug('LIFECYCLE', `Auto-resolved task #${taskId} via direct reference from obs #${obsId}`);
      }
    }
  }

  // Tier 2: Semantic match via Jaccard similarity > 0.4
  const openTasks = db.prepare(
    `SELECT id, title, project FROM tasks
     WHERE project = ? AND status IN ('todo', 'in_progress')
     ORDER BY created_at_epoch DESC LIMIT 200`
  ).all(project) as OpenTask[];

  if (openTasks.length === 0) return resolved;

  const obsTokens = tokenize(obsText);
  if (obsTokens.size === 0) return resolved;

  // Find best matching task above threshold
  let bestMatch: OpenTask | null = null;
  let bestScore = 0;

  for (const task of openTasks) {
    const taskTokens = tokenize(task.title);
    const score = jaccard(obsTokens, taskTokens);
    if (score > 0.4 && score > bestScore) {
      bestScore = score;
      bestMatch = task;
    }
  }

  if (bestMatch) {
    const result = db.prepare(
      `UPDATE tasks SET status = 'done', completed_at_epoch = ?, updated_at_epoch = ?
       WHERE id = ? AND status != 'done'`
    ).run(now, now, bestMatch.id);

    if (result.changes > 0) {
      resolved++;
      logger.debug('LIFECYCLE', `Auto-resolved task #${bestMatch.id} "${bestMatch.title}" via semantic match (score=${bestScore.toFixed(2)}) from obs #${obsId}`);
    }
  }

  if (resolved > 0) {
    logger.info('LIFECYCLE', `Auto-resolved ${resolved} task(s) from observation #${obsId}`, { project, obsType: obs.type });
  }

  return resolved;
}

/**
 * Check if a task title is a near-duplicate of an existing open task.
 *
 * Uses token-based Jaccard similarity > 0.7 to detect duplicates.
 * Only checks open tasks (status != 'done') in the same project.
 */
export function isDuplicate(
  db: Database,
  title: string,
  project: string
): boolean {
  const openTasks = db.prepare(
    `SELECT id, title FROM tasks
     WHERE project = ? AND status != 'done'
     ORDER BY created_at_epoch DESC LIMIT 200`
  ).all(project) as { id: number; title: string }[];

  if (openTasks.length === 0) return false;

  const newTokens = tokenize(title);
  if (newTokens.size === 0) return false;

  for (const task of openTasks) {
    const existingTokens = tokenize(task.title);
    const score = jaccard(newTokens, existingTokens);
    if (score > 0.7) {
      logger.debug('LIFECYCLE', `Duplicate detected: "${title}" ≈ "${task.title}" (score=${score.toFixed(2)})`, { project, existingTaskId: task.id });
      return true;
    }
  }

  return false;
}

/**
 * Mark tasks older than N days as stale.
 * Only affects tasks with status='todo' (not in_progress or done).
 */
export function markStaleTasks(
  db: Database,
  project: string | null,
  staleDays: number = 30
): number {
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  let result;
  if (project) {
    result = db.prepare(
      `UPDATE tasks SET status = 'stale', updated_at_epoch = ?
       WHERE status = 'todo' AND project = ? AND created_at_epoch < ?`
    ).run(now, project, cutoff);
  } else {
    result = db.prepare(
      `UPDATE tasks SET status = 'stale', updated_at_epoch = ?
       WHERE status = 'todo' AND created_at_epoch < ?`
    ).run(now, cutoff);
  }

  if (result.changes > 0) {
    logger.info('LIFECYCLE', `Marked ${result.changes} task(s) as stale (older than ${staleDays} days)`, { project: project || 'all' });
  }

  return result.changes;
}

/**
 * Bulk-close tasks by status and/or age.
 */
export function bulkCloseTasks(
  db: Database,
  project: string | null,
  olderThanDays?: number,
  status?: string
): number {
  const now = Date.now();
  const conditions: string[] = ["status != 'done'"];
  const params: any[] = [now, now];

  if (project) {
    conditions.push('project = ?');
    params.push(project);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (olderThanDays) {
    const cutoff = now - olderThanDays * 24 * 60 * 60 * 1000;
    conditions.push('created_at_epoch < ?');
    params.push(cutoff);
  }

  const where = conditions.join(' AND ');
  const result = db.prepare(
    `UPDATE tasks SET status = 'done', completed_at_epoch = ?, updated_at_epoch = ? WHERE ${where}`
  ).run(...params);

  if (result.changes > 0) {
    logger.info('LIFECYCLE', `Bulk-closed ${result.changes} task(s)`, { project: project || 'all', olderThanDays, status });
  }

  return result.changes;
}

/**
 * Find and merge duplicate tasks within a project.
 * Returns duplicates found. If dryRun=false, closes the newer duplicates.
 */
export function deduplicateTasks(
  db: Database,
  project: string | null,
  dryRun: boolean = true
): { duplicates: Array<{ kept: number; closed: number; title: string; similarity: number }>; totalClosed: number } {
  const conditions = ["status != 'done'"];
  const params: any[] = [];

  if (project) {
    conditions.push('project = ?');
    params.push(project);
  }

  const where = conditions.join(' AND ');
  const tasks = db.prepare(
    `SELECT id, title, project, created_at_epoch FROM tasks WHERE ${where} ORDER BY created_at_epoch ASC`
  ).all(...params) as { id: number; title: string; project: string; created_at_epoch: number }[];

  const duplicates: Array<{ kept: number; closed: number; title: string; similarity: number }> = [];
  const closedIds = new Set<number>();

  for (let i = 0; i < tasks.length; i++) {
    if (closedIds.has(tasks[i].id)) continue;
    const tokensA = tokenize(tasks[i].title);
    if (tokensA.size === 0) continue;

    for (let j = i + 1; j < tasks.length; j++) {
      if (closedIds.has(tasks[j].id)) continue;
      const tokensB = tokenize(tasks[j].title);
      const score = jaccard(tokensA, tokensB);

      if (score > 0.7) {
        duplicates.push({
          kept: tasks[i].id,
          closed: tasks[j].id,
          title: tasks[j].title,
          similarity: parseFloat(score.toFixed(2)),
        });
        closedIds.add(tasks[j].id);
      }
    }
  }

  let totalClosed = 0;
  if (!dryRun && closedIds.size > 0) {
    const now = Date.now();
    const closeStmt = db.prepare(
      `UPDATE tasks SET status = 'done', completed_at_epoch = ?, updated_at_epoch = ? WHERE id = ?`
    );
    for (const id of closedIds) {
      closeStmt.run(now, now, id);
      totalClosed++;
    }
    logger.info('LIFECYCLE', `Deduplicated: closed ${totalClosed} duplicate task(s)`, { project: project || 'all' });
  }

  return { duplicates, totalClosed };
}

/**
 * Get task counts grouped by status for a project (or all projects).
 */
export function getTaskStats(
  db: Database,
  project: string | null
): Record<string, number> {
  let rows;
  if (project) {
    rows = db.prepare(
      'SELECT status, COUNT(*) as count FROM tasks WHERE project = ? GROUP BY status'
    ).all(project) as { status: string; count: number }[];
  } else {
    rows = db.prepare(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    ).all() as { status: string; count: number }[];
  }

  const stats: Record<string, number> = {};
  for (const row of rows) {
    stats[row.status] = row.count;
  }
  return stats;
}
