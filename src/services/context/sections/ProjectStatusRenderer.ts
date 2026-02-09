/**
 * ProjectStatusRenderer - Renders PM status section for context injection
 *
 * Adds a compact (~115 tokens) project status summary showing:
 * - Open bugs count
 * - Active todos count
 * - Learnings captured
 * - Most recent decision
 */

import { Database } from 'bun:sqlite';

interface PMStatus {
  bugs: number;
  todos: number;
  learnings: number;
  lastDecision: string | null;
  lastDecisionAge: string | null;
}

/**
 * Query PM status from tags tables
 */
function queryPMStatus(db: Database, project: string): PMStatus | null {
  // Check if tags table exists (migration 009 may not have run)
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tags'"
  ).get();
  if (!tableCheck) return null;

  const projectFilter = 'AND o.project = ?';

  const bugCount = db.prepare(`
    SELECT COUNT(DISTINCT it.item_id) as count
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
    WHERE t.name = 'bug' ${projectFilter}
  `).get(project) as { count: number };

  const todoCount = db.prepare(`
    SELECT COUNT(DISTINCT it.item_id) as count
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
    WHERE t.name = 'todo' ${projectFilter}
  `).get(project) as { count: number };

  // Include kanban tasks as todos
  const taskCount = db.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE status IN ('todo', 'in_progress') AND project = ?
  `).get(project) as { count: number };

  const learningCount = db.prepare(`
    SELECT COUNT(DISTINCT it.item_id) as count
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
    WHERE t.name IN ('learning', 'decision') ${projectFilter}
  `).get(project) as { count: number };

  // Most recent decision
  const lastDecision = db.prepare(`
    SELECT o.title, o.created_at_epoch
    FROM observations o
    JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
    JOIN tags t ON t.id = it.tag_id
    WHERE t.name = 'decision' AND o.project = ?
    ORDER BY o.created_at_epoch DESC
    LIMIT 1
  `).get(project) as { title: string; created_at_epoch: number } | undefined;

  let lastDecisionText: string | null = null;
  let lastDecisionAge: string | null = null;

  if (lastDecision) {
    lastDecisionText = lastDecision.title;
    const ageMs = Date.now() - lastDecision.created_at_epoch;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));

    if (ageDays > 0) {
      lastDecisionAge = `${ageDays} day${ageDays !== 1 ? 's' : ''} ago`;
    } else if (ageHours > 0) {
      lastDecisionAge = `${ageHours} hour${ageHours !== 1 ? 's' : ''} ago`;
    } else {
      lastDecisionAge = 'just now';
    }
  }

  return {
    bugs: bugCount.count,
    todos: todoCount.count + taskCount.count,
    learnings: learningCount.count,
    lastDecision: lastDecisionText,
    lastDecisionAge
  };
}

/**
 * Render project status section for context injection
 * Returns empty array if no PM data exists (no tags table or no tagged items)
 */
export function renderProjectStatus(db: Database, project: string, useColors: boolean): string[] {
  const status = queryPMStatus(db, project);
  if (!status) return [];

  // Don't render if no tagged items
  if (status.bugs === 0 && status.todos === 0 && status.learnings === 0 && !status.lastDecision) {
    return [];
  }

  const output: string[] = [];
  output.push('');
  output.push('## Project Status');

  if (status.bugs > 0) {
    output.push(`- ${status.bugs} open bug${status.bugs !== 1 ? 's' : ''}`);
  }
  if (status.todos > 0) {
    output.push(`- ${status.todos} active todo${status.todos !== 1 ? 's' : ''}`);
  }
  if (status.learnings > 0) {
    output.push(`- ${status.learnings} learning${status.learnings !== 1 ? 's' : ''} captured`);
  }
  if (status.lastDecision && status.lastDecisionAge) {
    const truncated = status.lastDecision.length > 60
      ? status.lastDecision.substring(0, 57) + '...'
      : status.lastDecision;
    output.push(`- Last decision: "${truncated}" (${status.lastDecisionAge})`);
  }

  // Recent item titles (adds ~80-120 tokens of specific context)
  try {
    const recentBugs = db.prepare(`
      SELECT o.title FROM observations o
      JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
      JOIN tags t ON t.id = it.tag_id
      WHERE t.name = 'bug' AND o.project = ? AND o.title IS NOT NULL
      ORDER BY o.created_at_epoch DESC LIMIT 3
    `).all(project) as { title: string }[];

    if (recentBugs.length > 0) {
      output.push(`- Recent bugs: ${recentBugs.map(b => b.title.length > 50 ? b.title.substring(0, 47) + '...' : b.title).join(', ')}`);
    }

    const recentLearnings = db.prepare(`
      SELECT o.title FROM observations o
      JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
      JOIN tags t ON t.id = it.tag_id
      WHERE t.name IN ('learning', 'decision') AND o.project = ? AND o.title IS NOT NULL
      ORDER BY o.created_at_epoch DESC LIMIT 3
    `).all(project) as { title: string }[];

    if (recentLearnings.length > 0) {
      output.push(`- Recent learnings: ${recentLearnings.map(l => l.title.length > 50 ? l.title.substring(0, 47) + '...' : l.title).join(', ')}`);
    }
  } catch { /* tags queries may fail on older schemas */ }

  // Last session info
  try {
    const lastSession = db.prepare(`
      SELECT started_at_epoch,
             (SELECT COUNT(*) FROM observations WHERE memory_session_id = s.session_id) as obs_count
      FROM sdk_sessions s
      WHERE s.project = ?
      ORDER BY s.started_at_epoch DESC
      LIMIT 1
    `).get(project) as { started_at_epoch: number; obs_count: number } | undefined;

    if (lastSession) {
      const ageMs = Date.now() - lastSession.started_at_epoch;
      const ageMinutes = Math.floor(ageMs / 60000);
      const ageStr = ageMinutes < 60
        ? `${ageMinutes} min ago`
        : `${Math.floor(ageMinutes / 60)}h ago`;
      output.push(`- Last session: ${ageStr}, ${lastSession.obs_count} observations`);
    }
  } catch { /* sdk_sessions table may not exist */ }

  // Recent files
  try {
    const recentFileRows = db.prepare(`
      SELECT files_modified FROM observations
      WHERE project = ? AND files_modified IS NOT NULL AND files_modified != '[]'
      ORDER BY created_at_epoch DESC
      LIMIT 5
    `).all(project) as { files_modified: string }[];

    const files = new Set<string>();
    for (const row of recentFileRows) {
      try {
        for (const f of JSON.parse(row.files_modified)) {
          files.add(f);
          if (files.size >= 5) break;
        }
      } catch { /* skip */ }
      if (files.size >= 5) break;
    }
    if (files.size > 0) {
      output.push(`- Recent files: ${[...files].join(', ')}`);
    }
  } catch { /* files_modified column may not exist */ }

  return output;
}
