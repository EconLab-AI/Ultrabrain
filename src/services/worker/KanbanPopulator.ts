import { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';

export function backfillKanbanFromExistingObservations(db: Database, project: string): number {
  // Get all tagged observations that don't have kanban tasks yet
  const tagged = db.prepare(`
    SELECT o.id, o.title, o.project, GROUP_CONCAT(t.name) as tags
    FROM observations o
    JOIN item_tags it ON o.id = it.item_id AND it.item_type = 'observation'
    JOIN tags t ON t.id = it.tag_id
    WHERE o.project = ? AND t.name IN ('bug', 'todo', 'feature')
    AND o.id NOT IN (SELECT observation_id FROM tasks WHERE observation_id IS NOT NULL)
    GROUP BY o.id
  `).all(project) as { id: number; title: string | null; project: string; tags: string }[];

  let created = 0;
  for (const obs of tagged) {
    populateKanbanFromObservation(db, obs.id, obs.tags.split(','), obs.title, obs.project);
    created++;
  }

  logger.info('KANBAN', `Backfill completed: ${created} tasks created for ${project}`);
  return created;
}

export function populateKanbanFromObservation(
  db: Database,
  observationId: number,
  tagNames: string[],
  title: string | null,
  project: string
): void {
  // Only create tasks for actionable tags
  const actionableTags = tagNames.filter(t => ['bug', 'todo', 'feature'].includes(t));
  if (actionableTags.length === 0) return;

  // Check if task already exists for this observation
  const existing = db.prepare(
    'SELECT id FROM tasks WHERE observation_id = ?'
  ).get(observationId);
  if (existing) return;

  // Determine priority and category from tags
  const priority = actionableTags.includes('bug') ? 'high' : 'medium';
  const category = actionableTags.includes('bug') ? 'bug'
    : actionableTags.includes('feature') ? 'feature'
    : 'task';

  const now = Date.now();
  const taskTitle = title || `Auto: observation #${observationId}`;

  try {
    db.prepare(`
      INSERT INTO tasks (project, title, description, status, priority, category, observation_id, created_at_epoch, updated_at_epoch)
      VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?)
    `).run(project, taskTitle, null, priority, category, observationId, now, now);

    logger.debug('KANBAN', `Auto-created task from observation #${observationId}`, {
      project, priority, category, tags: actionableTags.join(',')
    });
  } catch (error) {
    logger.debug('KANBAN', 'Auto-create task failed (non-critical)', { observationId }, error as Error);
  }
}
