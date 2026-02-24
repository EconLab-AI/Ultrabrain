/**
 * KnowledgeCompactor — Periodic knowledge maintenance and compaction
 *
 * Runs as a background cron on configurable intervals to:
 * 1. Merge exact duplicate observations (same title+project+type)
 * 2. Decay relevance scores based on age
 * 3. Mark stale observations (low relevance + old)
 * 4. Link bugfix/change observations to their related discoveries
 * 5. Clean up orphaned item_tags
 *
 * All operations are idempotent and safe to run multiple times.
 */

import { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import {
  markStaleObservations,
  decayRelevanceScores,
  mergeExactDuplicates,
  linkRelatedObservations,
} from './ObservationLifecycleManager.js';

export interface CompactionResult {
  duplicatesMerged: number;
  relevanceDecayed: number;
  markedStale: number;
  linked: number;
  orphanTagsCleaned: number;
  staleTasksArchived: number;
  durationMs: number;
}

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum

export class KnowledgeCompactor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private getDb: () => Database,
    private intervalMs: number = DEFAULT_INTERVAL_MS
  ) {
    if (intervalMs < MIN_INTERVAL_MS) {
      this.intervalMs = MIN_INTERVAL_MS;
    }
  }

  /**
   * Start periodic compaction. Safe to call multiple times (idempotent).
   */
  start(): void {
    if (this.timer) return;

    // Run once immediately after a short delay (let worker settle)
    setTimeout(() => {
      this.runCompaction().catch(err => {
        logger.error('COMPACTOR', 'Initial compaction failed', {}, err as Error);
      });
    }, 30_000); // 30 second startup delay

    this.timer = setInterval(() => {
      this.runCompaction().catch(err => {
        logger.error('COMPACTOR', 'Periodic compaction failed', {}, err as Error);
      });
    }, this.intervalMs);

    const hours = (this.intervalMs / (60 * 60 * 1000)).toFixed(1);
    logger.info('COMPACTOR', `Knowledge compactor started (interval: ${hours}h)`);
  }

  /**
   * Stop periodic compaction.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('COMPACTOR', 'Knowledge compactor stopped');
    }
  }

  /**
   * Run a single compaction cycle. Can be called manually or by the timer.
   */
  async runCompaction(): Promise<CompactionResult> {
    if (this.running) {
      logger.debug('COMPACTOR', 'Skipping compaction — already running');
      return { duplicatesMerged: 0, relevanceDecayed: 0, markedStale: 0, linked: 0, orphanTagsCleaned: 0, durationMs: 0 };
    }

    this.running = true;
    const start = Date.now();

    try {
      const db = this.getDb();

      // 1. Merge exact duplicates
      const duplicatesMerged = mergeExactDuplicates(db, 1);

      // 2. Decay relevance scores
      const relevanceDecayed = decayRelevanceScores(db);

      // 3. Mark stale observations
      const markedStale = markStaleObservations(db, 30);

      // 4. Link related observations
      const linked = linkRelatedObservations(db);

      // 5. Clean orphaned item_tags (tags pointing to non-existent observations)
      const orphanTagsCleaned = this.cleanOrphanedTags(db);

      // 6. Archive stale kanban tasks (done > 7 days, todo > 30 days old)
      const staleTasksArchived = this.archiveStaleTasks(db);

      const durationMs = Date.now() - start;

      const result: CompactionResult = {
        duplicatesMerged,
        relevanceDecayed,
        markedStale,
        linked,
        orphanTagsCleaned,
        staleTasksArchived,
        durationMs,
      };

      const totalChanges = duplicatesMerged + markedStale + linked + orphanTagsCleaned + staleTasksArchived;
      if (totalChanges > 0) {
        logger.info('COMPACTOR', `Compaction complete: ${totalChanges} changes in ${durationMs}ms`, result);
      } else {
        logger.debug('COMPACTOR', `Compaction complete: no changes needed (${durationMs}ms)`);
      }

      return result;
    } finally {
      this.running = false;
    }
  }

  /**
   * Clean orphaned item_tags entries where the referenced observation no longer exists.
   */
  private cleanOrphanedTags(db: Database): number {
    const result = db.prepare(`
      DELETE FROM item_tags
      WHERE item_type = 'observation'
      AND item_id NOT IN (SELECT id FROM observations)
    `).run();

    if (result.changes > 0) {
      logger.debug('COMPACTOR', `Cleaned ${result.changes} orphaned item_tags`);
    }

    return result.changes;
  }

  /**
   * Archive stale kanban tasks:
   * - 'done' tasks older than 7 days → deleted
   * - 'todo' tasks older than 30 days with no activity → 'done' (auto-closed)
   */
  private archiveStaleTasks(db: Database): number {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Delete old completed tasks (keep DB lean)
    const deletedDone = db.prepare(`
      DELETE FROM tasks WHERE status = 'done' AND updated_at_epoch < ?
    `).run(sevenDaysAgo);

    // Auto-close very old todo tasks (likely abandoned)
    const closedStale = db.prepare(`
      UPDATE tasks SET status = 'done', updated_at_epoch = ?
      WHERE status = 'todo' AND created_at_epoch < ?
    `).run(now, thirtyDaysAgo);

    const total = deletedDone.changes + closedStale.changes;
    if (total > 0) {
      logger.info('COMPACTOR', `Task cleanup: deleted ${deletedDone.changes} old done tasks, closed ${closedStale.changes} stale todo tasks`);
    }

    return total;
  }
}
