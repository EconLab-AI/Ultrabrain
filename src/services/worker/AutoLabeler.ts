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
  bugfix: 'fix',       // Past-tense: bug was fixed (use 'fix' not 'bug' — the bug is resolved)
  decision: 'decision',
  feature: 'feature',  // Past-tense: feature was built
  refactor: 'refactor',
  // NOTE: 'discovery' does NOT auto-map to 'learning' - too many false positives
  // NOTE: 'change' does NOT auto-map to 'feature' - too many false positives from local agent
  //        Every code edit was being tagged as 'feature', inflating counts
};

/**
 * Titles/patterns that should NEVER be tagged (garbage filter).
 * These are generic session artifacts or mechanical Local Agent outputs.
 */
const GARBAGE_TITLE_PATTERNS: RegExp[] = [
  /^Initial User Request$/i,
  /^Started? Server$/i,
  /^Stop(?:ped)? Server$/i,
  /^Server Restart$/i,
  /^User (?:prompt|message|request)$/i,
  /^Session (?:start|end|init)/i,
  /^no (?:specific )?details/i,
  // Local Agent mechanical titles that shouldn't be tagged
  /^(?:Read|Update|Extend|Refactor|Create|Fix|Multi-edit)\s+\w+\s+(?:component|route|hook|test|styles|config|docs|migration)$/i,
  /^Explore codebase/i,
  /^Search for "/i,
  /^Find files matching/i,
  /^Run (?:shell command|`)/i,
  /^(?:Syntax|Lint) check/i,
  /^(?:Check|Test) (?:health|endpoint)/i,
  /^Delegate:/i,
];

/** Keyword patterns → tag names (matched against observation text/title/narrative) */
const TEXT_TAG_RULES: [RegExp, string][] = [
  // High-confidence: explicit markers
  [/\b(todo|TODO|fixme|FIXME|hack|HACK)\b/, 'todo'],

  // Ideas: require context words, not just "idea" alone
  [/\b(brainstorm|proposal|could\s+(?:we|you)|might\s+want|consider\s+adding|future\s+enhancement)\b/i, 'idea'],
  [/\b(roadmap|geplant|zukünftig|planned-feature)\b/i, 'planned-feature'],

  // Bugs: require error/failure context, not just the word "error" in logs
  [/\b(crash(?:es|ed|ing)?|broken|fails?\s+(?:to|with|when)|exception|traceback|stack\s*trace)\b/i, 'bug'],
  [/\b(regression|defect|malfunction|not\s+working)\b/i, 'bug'],

  // Learning: require actual insight words (not just "found a file")
  [/\b(learned?|lesson|insight|realize[ds]?|gotcha|pitfall|caveat|trick|important\s+to\s+know)\b/i, 'learning'],
  [/\b(TIL|til|best\s+practice|anti-?pattern|root\s+cause)\b/i, 'learning'],

  // Infrastructure tags (unchanged, low false-positive risk)
  [/\b(security|auth|vulnerability|xss|injection|CVE)\b/i, 'security'],
  [/\b(perf|performance|optimize|speed|latency|benchmark)\b/i, 'performance'],
  [/\b(deploy|docker|ci|cd|pipeline|infra|kubernetes)\b/i, 'devops'],
  [/\b(doc|readme|documentation|changelog)\b/i, 'docs'],
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
 * Determine which tags should be applied to an observation.
 * Returns empty array for garbage observations (filtered out).
 */
export function detectTags(
  type: string,
  title: string | null,
  narrative: string | null,
  text: string | null
): string[] {
  // Garbage filter: skip observations with generic/useless titles
  if (title && GARBAGE_TITLE_PATTERNS.some(p => p.test(title))) {
    return [];
  }

  // Skip observations with empty/generic narratives
  if (narrative && /no (?:specific )?details (?:or requests )?were provided/i.test(narrative)) {
    return [];
  }

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
