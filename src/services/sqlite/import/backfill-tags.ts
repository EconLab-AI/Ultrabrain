/**
 * Backfill Tags - One-time script to auto-label all existing observations
 *
 * Scans all observations and applies system tags based on type + text rules.
 * Safe to run multiple times (INSERT OR IGNORE prevents duplicates).
 */

import { Database } from 'bun:sqlite';
import { autoLabelObservationBatch, autoLabelSummary, resetTagCache } from '../../worker/AutoLabeler.js';
import { logger } from '../../../utils/logger.js';

interface ObservationRow {
  id: number;
  type: string;
  title: string | null;
  narrative: string | null;
  text: string | null;
}

interface SummaryRow {
  id: number;
  request: string | null;
  investigated: string | null;
  learned: string | null;
  completed: string | null;
  next_steps: string | null;
}

/**
 * Backfill tags for all existing observations and summaries
 */
export function backfillTags(db: Database): { tagged: number; skipped: number; summariesTagged: number } {
  // Reset cache to pick up any newly created tags
  resetTagCache();

  // Check if tags table exists
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tags'"
  ).get();
  if (!tableCheck) {
    throw new Error('Tags table does not exist. Run migration 009 first.');
  }

  // Backfill observations
  const observations = db.prepare(
    'SELECT id, type, title, narrative, text FROM observations ORDER BY id'
  ).all() as ObservationRow[];

  logger.info('BACKFILL', `Processing ${observations.length} observations for auto-labeling`);
  const obsResult = autoLabelObservationBatch(db, observations);

  // Backfill summaries
  const summaries = db.prepare(
    'SELECT id, request, investigated, learned, completed, next_steps FROM session_summaries ORDER BY id'
  ).all() as SummaryRow[];

  let summariesTagged = 0;
  for (const summary of summaries) {
    const count = autoLabelSummary(
      db,
      summary.id,
      summary.request,
      summary.investigated,
      summary.learned,
      summary.completed,
      summary.next_steps
    );
    if (count > 0) summariesTagged++;
  }

  logger.info('BACKFILL', 'Backfill complete', {
    observationsTagged: obsResult.tagged,
    observationsSkipped: obsResult.skipped,
    summariesTagged,
    totalObservations: observations.length,
    totalSummaries: summaries.length
  });

  return {
    tagged: obsResult.tagged,
    skipped: obsResult.skipped,
    summariesTagged
  };
}
