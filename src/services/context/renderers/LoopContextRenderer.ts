/**
 * LoopContextRenderer - Renders active loop context for SessionStart injection
 *
 * When an active UltraBrain Loop exists for a project, injects:
 * - Loop task description and iteration progress
 * - Previous iteration summaries (last 5)
 * - Success criteria
 * - Completion promise instructions
 *
 * Target: 200-500 tokens
 */

import { Database } from 'bun:sqlite';

interface LoopConfig {
  id: number;
  project: string;
  enabled: number;
  mode: string;
  max_iterations: number;
  task_description: string | null;
  success_criteria: string | null;
  completion_promises: string | null;
  promise_logic: string;
}

interface LoopIteration {
  id: number;
  iteration_number: number;
  mode_used: string | null;
  status: string;
  key_findings: string | null;
  observations_count: number;
}

/**
 * Render loop context for SessionStart injection
 * Returns empty array if no active loop exists
 */
export function renderLoopContext(db: Database, project: string, useColors: boolean): string[] {
  // Check if loop tables exist (migration 010 may not have run)
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='loop_configs'"
  ).get();
  if (!tableCheck) return [];

  const config = db.prepare(
    'SELECT * FROM loop_configs WHERE project = ? AND enabled = 1'
  ).get(project) as LoopConfig | undefined;
  if (!config) return [];

  const iterations = db.prepare(
    'SELECT * FROM loop_iterations WHERE loop_config_id = ? ORDER BY iteration_number ASC'
  ).all(config.id) as LoopIteration[];

  const output: string[] = [];
  const currentIter = iterations.length;
  const task = config.task_description || 'Unnamed task';

  output.push('');
  output.push(`## Active Loop: "${task}" (Iteration ${currentIter + 1}/${config.max_iterations}, Mode: ${config.mode})`);

  // Previous iterations (last 5)
  if (iterations.length > 0) {
    output.push('### Previous Iterations:');
    for (const iter of iterations.slice(-5)) {
      const findings = iter.key_findings || 'No findings recorded';
      const obsCount = iter.observations_count > 0 ? ` [${iter.observations_count} obs]` : '';
      output.push(`- Iter ${iter.iteration_number} (${iter.mode_used || config.mode}): ${findings}${obsCount}`);
    }
  }

  // Success criteria
  if (config.success_criteria) {
    output.push('### Success Criteria:');
    output.push(config.success_criteria);
  }

  // Completion promises
  if (config.completion_promises) {
    try {
      const promises = JSON.parse(config.completion_promises) as string[];
      if (promises.length > 0) {
        const logic = config.promise_logic === 'all' ? 'ALL' : 'ANY';
        output.push(`### Completion (${logic}): Say ${promises.map(p => `<promise>${p}</promise>`).join(' ')} when done.`);
      }
    } catch {
      // skip malformed JSON
    }
  }

  return output;
}
