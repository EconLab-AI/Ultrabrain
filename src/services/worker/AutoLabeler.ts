/**
 * AutoLabeler - Rule-based auto-labeling for observations and summaries
 *
 * Zero LLM cost: uses observation type mapping + keyword pattern matching
 * to assign system tags automatically after storage.
 *
 * Triggered fire-and-forget from ResponseProcessor (same pattern as LanceSync).
 */

import { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';

/** Maps observation.type → system tag name */
const TYPE_TAG_MAP: Record<string, string> = {
  bugfix: 'bug',
  decision: 'decision',
  feature: 'feature',
  refactor: 'refactor',
  discovery: 'learning',
  change: 'feature',
};

/** Keyword patterns → tag names (matched against observation text/title/narrative) */
const TEXT_TAG_RULES: [RegExp, string][] = [
  [/\b(todo|TODO|fixme|FIXME|hack|HACK)\b/, 'todo'],
  [/\b(idea|brainstorm|concept|proposal)\b/i, 'idea'],
  [/\b(bug|crash|broken|error|fail)\b/i, 'bug'],
  [/\b(learn|discover|found|realize|insight)\b/i, 'learning'],
  [/\b(security|auth|vulnerability|xss|injection)\b/i, 'security'],
  [/\b(perf|performance|optimize|speed|latency)\b/i, 'performance'],
  [/\b(deploy|docker|ci|cd|pipeline|infra)\b/i, 'devops'],
  [/\b(doc|readme|documentation)\b/i, 'docs'],
  [/\b(planned|future|roadmap|geplant|zukünftig|planned-feature)\b/i, 'planned-feature'],
];

/** Cached tag name → id map (populated once per worker lifetime) */
let tagIdCache: Map<string, number> | null = null;

function getTagIdMap(db: Database): Map<string, number> {
  if (tagIdCache) return tagIdCache;

  const rows = db.prepare('SELECT id, name FROM tags WHERE is_system = 1').all() as { id: number; name: string }[];
  tagIdCache = new Map(rows.map(r => [r.name, r.id]));
  return tagIdCache;
}

/** Reset cache (e.g., after migration or tag creation) */
export function resetTagCache(): void {
  tagIdCache = null;
}

/**
 * Determine which tags should be applied to an observation
 */
export function detectTags(
  type: string,
  title: string | null,
  narrative: string | null,
  text: string | null
): string[] {
  const tags = new Set<string>();

  // 1. Map observation type → tag
  const typeTag = TYPE_TAG_MAP[type];
  if (typeTag) {
    tags.add(typeTag);
  }

  // 2. Scan text content for keyword patterns
  const content = [title, narrative, text].filter(Boolean).join(' ');
  for (const [pattern, tagName] of TEXT_TAG_RULES) {
    if (pattern.test(content)) {
      tags.add(tagName);
    }
  }

  return Array.from(tags);
}

/**
 * Auto-label a single observation (fire-and-forget)
 */
export function autoLabelObservation(
  db: Database,
  observationId: number,
  type: string,
  title: string | null,
  narrative: string | null,
  text: string | null
): number {
  const tagNames = detectTags(type, title, narrative, text);
  if (tagNames.length === 0) return 0;

  const tagIdMap = getTagIdMap(db);
  const now = Date.now();
  let tagged = 0;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO item_tags (tag_id, item_type, item_id, created_at_epoch) VALUES (?, ?, ?, ?)'
  );

  for (const tagName of tagNames) {
    const tagId = tagIdMap.get(tagName);
    if (tagId) {
      insert.run(tagId, 'observation', observationId, now);
      tagged++;
    }
  }

  if (tagged > 0) {
    logger.debug('AUTOLABEL', `Tagged observation #${observationId}`, {
      tags: tagNames.join(', '),
      type
    });
  }

  return tagged;
}

/**
 * Auto-label a single summary (fire-and-forget)
 */
export function autoLabelSummary(
  db: Database,
  summaryId: number,
  request: string | null,
  investigated: string | null,
  learned: string | null,
  completed: string | null,
  nextSteps: string | null
): number {
  const content = [request, investigated, learned, completed, nextSteps].filter(Boolean).join(' ');
  const tags = new Set<string>();

  for (const [pattern, tagName] of TEXT_TAG_RULES) {
    if (pattern.test(content)) {
      tags.add(tagName);
    }
  }

  if (tags.size === 0) return 0;

  const tagIdMap = getTagIdMap(db);
  const now = Date.now();
  let tagged = 0;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO item_tags (tag_id, item_type, item_id, created_at_epoch) VALUES (?, ?, ?, ?)'
  );

  for (const tagName of tags) {
    const tagId = tagIdMap.get(tagName);
    if (tagId) {
      insert.run(tagId, 'summary', summaryId, now);
      tagged++;
    }
  }

  if (tagged > 0) {
    logger.debug('AUTOLABEL', `Tagged summary #${summaryId}`, {
      tags: Array.from(tags).join(', ')
    });
  }

  return tagged;
}

/**
 * Auto-label multiple observations in batch (used by backfill)
 */
export function autoLabelObservationBatch(
  db: Database,
  observations: { id: number; type: string; title: string | null; narrative: string | null; text: string | null }[]
): { tagged: number; skipped: number } {
  let tagged = 0;
  let skipped = 0;

  for (const obs of observations) {
    const count = autoLabelObservation(db, obs.id, obs.type, obs.title, obs.narrative, obs.text);
    if (count > 0) {
      tagged++;
    } else {
      skipped++;
    }
  }

  return { tagged, skipped };
}
