/**
 * Shared CWD Resolution Utility
 *
 * Resolves the working directory for a project using multiple fallback strategies:
 * 1. DB lookup (pending_messages.cwd)
 * 2. Filesystem scan (~/.claude/projects/)
 * 3. Common paths fallback (~/Desktop, ~/Projects, ~)
 */

import { existsSync, readdirSync } from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export function resolveProjectCwd(db: any, project: string): string | null {
  // Strategy 1: DB lookup (most reliable)
  try {
    const pending = db.prepare(`
      SELECT pm.cwd FROM pending_messages pm
      JOIN sdk_sessions s ON pm.session_db_id = s.id
      WHERE s.project = ? AND pm.cwd IS NOT NULL AND pm.cwd != ''
      ORDER BY pm.created_at_epoch DESC LIMIT 1
    `).get(project) as { cwd: string } | undefined;
    if (pending?.cwd && existsSync(pending.cwd)) return pending.cwd;
  } catch (e) {
    // DB strategy failed, continue to filesystem strategies
  }

  // Strategy 2: Scan .claude/projects directories
  const claudeProjectsDir = path.join(homedir(), '.claude', 'projects');
  try {
    const dirs = readdirSync(claudeProjectsDir);
    for (const dir of dirs) {
      if (!dir.toLowerCase().includes(project.toLowerCase().replace(/_/g, '-'))) continue;

      // Naive decode: encoded format is /Users/foo/bar -> -Users-foo-bar
      const naivePath = '/' + dir.replace(/^-/, '').replace(/-/g, '/');
      if (existsSync(naivePath)) return naivePath;

      // Try progressive dash-joining for project names with special chars
      const parts = dir.replace(/^-/, '').split('-');
      for (let joinAt = parts.length - 2; joinAt >= 1; joinAt--) {
        const prefix = '/' + parts.slice(0, joinAt).join('/');
        const suffix = parts.slice(joinAt).join('-');
        const candidate = prefix + '/' + suffix;
        if (existsSync(candidate)) return candidate;
        const candidateUnderscore = prefix + '/' + suffix.replace(/-/g, '_');
        if (existsSync(candidateUnderscore)) return candidateUnderscore;
      }
    }
  } catch (e) {
    // Filesystem scan failed
  }

  // Strategy 3: Common paths fallback
  for (const base of [path.join(homedir(), 'Desktop'), path.join(homedir(), 'Projects'), homedir()]) {
    const candidate = path.join(base, project);
    if (existsSync(candidate)) return candidate;
  }

  return null;
}
