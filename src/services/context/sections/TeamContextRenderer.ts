/**
 * TeamContextRenderer - Renders team context for SessionStart injection
 *
 * Adds a compact (~100 tokens) team context summary showing:
 * - Active teams with member count and task progress
 * - Most recent team decision (if tracked)
 *
 * Reads from ~/.claude/teams/ and ~/.claude/tasks/ filesystem directories.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';

export function renderTeamContext(project: string, useColors: boolean): string[] {
  const teamsDir = path.join(homedir(), '.claude', 'teams');
  const tasksDir = path.join(homedir(), '.claude', 'tasks');

  if (!existsSync(teamsDir)) return [];

  const output: string[] = [];
  let hasTeams = false;

  try {
    const teamDirs = readdirSync(teamsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const teamName of teamDirs) {
      const configPath = path.join(teamsDir, teamName, 'config.json');
      if (!existsSync(configPath)) continue;

      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        const members = config.members || [];

        // Count tasks for this team
        let taskCount = 0;
        let completedTasks = 0;
        const teamTasksDir = path.join(tasksDir, teamName);

        if (existsSync(teamTasksDir)) {
          try {
            const taskFiles = readdirSync(teamTasksDir).filter(f => f.endsWith('.json'));
            for (const tf of taskFiles) {
              try {
                const task = JSON.parse(readFileSync(path.join(teamTasksDir, tf), 'utf-8'));
                taskCount++;
                if (task.status === 'completed' || task.status === 'done') {
                  completedTasks++;
                }
              } catch { /* skip malformed task file */ }
            }
          } catch { /* skip unreadable tasks dir */ }
        }

        if (!hasTeams) {
          output.push('');
          output.push('## Team Context');
          hasTeams = true;
        }

        output.push(`- Team "${teamName}": ${members.length} member${members.length !== 1 ? 's' : ''}, ${completedTasks}/${taskCount} tasks complete`);
      } catch { /* skip malformed config */ }
    }
  } catch { /* skip if can't read teams dir */ }

  return output;
}
