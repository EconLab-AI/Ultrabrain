/**
 * ObservationLifecycleManager — Auto-Resolve observations when completion signals arrive
 *
 * When a bugfix/change observation is stored, this finds matching open
 * bug/discovery observations in the same project and marks them 'resolved'.
 *
 * This is the observation-level equivalent of TaskLifecycleManager
 * (which only operates on the tasks table).
 */

import { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';

// Observation types that signal work was completed
const COMPLETION_TYPES = new Set(['bugfix', 'change', 'refactor']);

// Observation types that represent open work/discoveries
const OPEN_TYPES = new Set(['discovery']);

// Keywords in completed observations that increase match confidence
const COMPLETION_SIGNALS = /\b(fixed|resolved|implemented|completed|done|merged|shipped|deployed|korrigiert|behoben|umgesetzt)\b/i;

/**
 * Tokenize a string for Jaccard similarity comparison.
 */
function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .split(/[^a-z0-9äöüß]+/)
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

interface OpenObservation {
  id: number;
  title: string;
  type: string;
  narrative: string | null;
}

/**
 * Auto-resolve open observations when a completion observation arrives.
 *
 * Called from ResponseProcessor after storeObservations.
 * When a bugfix/change observation is stored, find and resolve matching
 * bug/discovery observations in the same project.
 */
export function resolveMatchingObservations(
  db: Database,
  newObsId: number,
  obs: { type: string; title?: string | null; narrative?: string | null },
  project: string
): number {
  // Only trigger on completion-type observations
  if (!COMPLETION_TYPES.has(obs.type)) return 0;

  const obsTitle = obs.title || '';
  const obsNarrative = obs.narrative || '';
  const obsText = `${obsTitle} ${obsNarrative}`;

  // Extra confidence if completion keywords are present
  const hasCompletionWords = COMPLETION_SIGNALS.test(obsText);
  const similarityThreshold = hasCompletionWords ? 0.3 : 0.45;

  const now = Date.now();
  let resolved = 0;

  // Find active observations in the same project that could be resolved
  const openObs = db.prepare(`
    SELECT id, title, type, narrative
    FROM observations
    WHERE project = ? AND status = 'active'
    AND type IN ('discovery')
    AND id != ?
    ORDER BY created_at_epoch DESC
    LIMIT 200
  `).all(project, newObsId) as OpenObservation[];

  if (openObs.length === 0) return 0;

  const obsTokens = tokenize(obsText);
  if (obsTokens.size === 0) return 0;

  // Find matching observations above similarity threshold
  const resolveStmt = db.prepare(`
    UPDATE observations
    SET status = 'resolved', resolved_at_epoch = ?, linked_observation_id = ?
    WHERE id = ? AND status = 'active'
  `);

  for (const open of openObs) {
    const openText = `${open.title || ''} ${open.narrative || ''}`;
    const openTokens = tokenize(openText);
    const score = jaccard(obsTokens, openTokens);

    if (score > similarityThreshold) {
      const result = resolveStmt.run(now, newObsId, open.id);
      if (result.changes > 0) {
        resolved++;
        logger.debug('LIFECYCLE', `Auto-resolved observation #${open.id} "${open.title}" via match (score=${score.toFixed(2)}) from obs #${newObsId}`);
      }
    }
  }

  if (resolved > 0) {
    logger.info('LIFECYCLE', `Auto-resolved ${resolved} observation(s) from ${obs.type} #${newObsId}`, { project });
  }

  return resolved;
}

/**
 * Mark observations older than N days as stale (reduce relevance).
 * Only affects observations with status='active'.
 */
export function markStaleObservations(
  db: Database,
  staleDays: number = 30
): number {
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const result = db.prepare(`
    UPDATE observations
    SET status = 'stale', resolved_at_epoch = ?
    WHERE status = 'active' AND relevance_score < 0.3 AND created_at_epoch < ?
  `).run(now, cutoff);

  if (result.changes > 0) {
    logger.info('LIFECYCLE', `Marked ${result.changes} observation(s) as stale (relevance < 0.3, older than ${staleDays} days)`);
  }

  return result.changes;
}

/**
 * Decay relevance scores for all active observations.
 * Reduces relevance_score by a small amount based on age.
 * Linked observations (part of a chain) decay slower.
 */
export function decayRelevanceScores(db: Database): number {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Decay unlinked observations: -0.02 per day of age
  // Minimum relevance: 0.1 (never fully zero)
  const result = db.prepare(`
    UPDATE observations
    SET relevance_score = MAX(0.1, 1.0 - (? - created_at_epoch) * 0.02 / ?)
    WHERE status = 'active'
    AND linked_observation_id IS NULL
    AND relevance_score > 0.1
  `).run(now, oneDayMs);

  // Linked observations decay slower: -0.005 per day
  const linkedResult = db.prepare(`
    UPDATE observations
    SET relevance_score = MAX(0.2, 1.0 - (? - created_at_epoch) * 0.005 / ?)
    WHERE status = 'active'
    AND linked_observation_id IS NOT NULL
    AND relevance_score > 0.2
  `).run(now, oneDayMs);

  const total = result.changes + linkedResult.changes;
  if (total > 0) {
    logger.debug('LIFECYCLE', `Decayed relevance for ${total} observation(s)`);
  }

  return total;
}

/**
 * Merge exact-duplicate observations (same title + project + type within a time window).
 * Keeps the oldest, marks newer duplicates as 'archived'.
 */
export function mergeExactDuplicates(
  db: Database,
  windowHours: number = 1
): number {
  const windowMs = windowHours * 60 * 60 * 1000;
  const now = Date.now();

  // Find duplicate groups (same title + project + type, within time window)
  const duplicates = db.prepare(`
    SELECT MIN(id) as keep_id, title, project, type, COUNT(*) as cnt,
           GROUP_CONCAT(id) as all_ids
    FROM observations
    WHERE status = 'active' AND title IS NOT NULL
    GROUP BY title, project, type
    HAVING cnt > 1
  `).all() as { keep_id: number; title: string; project: string; type: string; cnt: number; all_ids: string }[];

  let archived = 0;
  const archiveStmt = db.prepare(`
    UPDATE observations
    SET status = 'archived', resolved_at_epoch = ?, linked_observation_id = ?
    WHERE id = ? AND status = 'active'
  `);

  for (const group of duplicates) {
    const ids = group.all_ids.split(',').map(Number);
    const keepId = ids[0]; // Keep the oldest (smallest ID)

    for (const id of ids.slice(1)) {
      const result = archiveStmt.run(now, keepId, id);
      if (result.changes > 0) archived++;
    }
  }

  if (archived > 0) {
    logger.info('LIFECYCLE', `Archived ${archived} duplicate observation(s) across ${duplicates.length} groups`);
  }

  return archived;
}

/**
 * Link bugfix observations to their related bug discoveries.
 * Scans unlinked bugfix observations and finds the best matching
 * bug/discovery observation to link them to.
 */
export function linkRelatedObservations(db: Database): number {
  // Find unlinked bugfix/change observations
  const unlinked = db.prepare(`
    SELECT id, title, narrative, project
    FROM observations
    WHERE type IN ('bugfix', 'change') AND linked_observation_id IS NULL AND status = 'active'
    ORDER BY created_at_epoch DESC
    LIMIT 500
  `).all() as { id: number; title: string; narrative: string | null; project: string }[];

  if (unlinked.length === 0) return 0;

  let linked = 0;
  const linkStmt = db.prepare(`
    UPDATE observations SET linked_observation_id = ? WHERE id = ?
  `);
  const reverseLinkStmt = db.prepare(`
    UPDATE observations
    SET linked_observation_id = ?, status = 'resolved', resolved_at_epoch = ?
    WHERE id = ? AND status = 'active'
  `);

  for (const fix of unlinked) {
    const fixText = `${fix.title || ''} ${fix.narrative || ''}`;
    const fixTokens = tokenize(fixText);
    if (fixTokens.size === 0) continue;

    // Find matching discovery in same project
    const candidates = db.prepare(`
      SELECT id, title, narrative
      FROM observations
      WHERE project = ? AND type = 'discovery' AND id < ? AND status IN ('active', 'resolved')
      ORDER BY created_at_epoch DESC
      LIMIT 100
    `).all(fix.project, fix.id) as { id: number; title: string; narrative: string | null }[];

    let bestMatch: { id: number } | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const candText = `${candidate.title || ''} ${candidate.narrative || ''}`;
      const score = jaccard(fixTokens, tokenize(candText));
      if (score > 0.35 && score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      // Link fix → discovery
      linkStmt.run(bestMatch.id, fix.id);
      // Mark discovery as resolved by this fix
      reverseLinkStmt.run(fix.id, Date.now(), bestMatch.id);
      linked++;
    }
  }

  if (linked > 0) {
    logger.info('LIFECYCLE', `Linked ${linked} fix/change observations to their related discoveries`);
  }

  return linked;
}
