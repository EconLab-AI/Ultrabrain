/**
 * ClaudeMd Routes
 *
 * API endpoints for discovering, reading, writing, and analyzing
 * CLAUDE.md files across the 7-level hierarchy.
 */

import express, { Request, Response } from 'express';
import { existsSync, readFileSync, writeFileSync, renameSync, statSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { DatabaseManager } from '../../DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { analyzeClamdeMd, type ClaudeMdFileInfo } from '../../ClaudeMdAnalyzer.js';
import { logger } from '../../../../utils/logger.js';

interface FileDescriptor {
  path: string;
  level: string;
  exists: boolean;
  content: string;
  lineCount: number;
  estimatedTokens: number;
  loadFrequency: 'every-message' | 'once-per-session' | 'on-demand';
  lastModified: number | null;
}

export class ClaudeMdRoutes extends BaseRouteHandler {
  constructor(private dbManager: DatabaseManager) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/claude-md/files', this.wrapHandler(this.handleDiscoverFiles.bind(this)));
    app.get('/api/claude-md/file', this.wrapHandler(this.handleReadFile.bind(this)));
    app.put('/api/claude-md/file', this.wrapHandler(this.handleWriteFile.bind(this)));
    app.get('/api/claude-md/suggestions', this.wrapHandler(this.handleSuggestions.bind(this)));
  }

  /**
   * GET /api/claude-md/files?project=...&cwd=...
   * Discover all CLAUDE.md files in the 7-level hierarchy.
   */
  private handleDiscoverFiles(req: Request, res: Response): void {
    const project = req.query.project as string;
    let cwd = req.query.cwd as string;

    // If no cwd provided, try to get it from the most recent session for this project
    if (!cwd && project) {
      cwd = this.getCwdForProject(project);
    }

    if (!cwd) {
      this.badRequest(res, 'Missing cwd query parameter and no session found for project');
      return;
    }

    const files = this.discoverFiles(cwd);
    res.json({ files });
  }

  /**
   * GET /api/claude-md/file?path=...
   * Read a single CLAUDE.md file's content.
   */
  private handleReadFile(req: Request, res: Response): void {
    const filePath = req.query.path as string;

    if (!filePath) {
      this.badRequest(res, 'Missing path query parameter');
      return;
    }

    if (!this.isPathSafe(filePath)) {
      this.badRequest(res, 'Invalid file path');
      return;
    }

    if (!existsSync(filePath)) {
      this.notFound(res, 'File not found');
      return;
    }

    const content = readFileSync(filePath, 'utf-8');
    const stat = statSync(filePath);

    res.json({
      path: filePath,
      content,
      lineCount: content.split('\n').length,
      estimatedTokens: Math.round(content.length / 4),
      lastModified: stat.mtimeMs,
    });
  }

  /**
   * PUT /api/claude-md/file?path=...
   * Write content to a CLAUDE.md file using atomic writes.
   * Body: { content: string }
   */
  private handleWriteFile(req: Request, res: Response): void {
    const filePath = req.query.path as string;
    const { content } = req.body;

    if (!filePath) {
      this.badRequest(res, 'Missing path query parameter');
      return;
    }

    if (content === undefined || content === null) {
      this.badRequest(res, 'Missing content in request body');
      return;
    }

    if (!this.isPathSafe(filePath)) {
      this.badRequest(res, 'Invalid file path - must be within project or home directory');
      return;
    }

    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Atomic write: write to temp file, then rename
    const tempFile = `${filePath}.tmp`;
    try {
      writeFileSync(tempFile, content, 'utf-8');
      renameSync(tempFile, filePath);
    } catch (error) {
      // Clean up temp file on failure
      try {
        if (existsSync(tempFile)) {
          writeFileSync(tempFile, ''); // truncate
          renameSync(tempFile, tempFile + '.failed');
        }
      } catch {
        // ignore cleanup errors
      }
      throw error;
    }

    logger.info('CLAUDE_MD', 'File written', { path: filePath, bytes: content.length });

    res.json({
      success: true,
      path: filePath,
      lineCount: content.split('\n').length,
      estimatedTokens: Math.round(content.length / 4),
    });
  }

  /**
   * GET /api/claude-md/suggestions?project=...&cwd=...
   * Get rule-based optimization suggestions for CLAUDE.md files.
   */
  private handleSuggestions(req: Request, res: Response): void {
    const project = req.query.project as string;
    let cwd = req.query.cwd as string;

    if (!cwd && project) {
      cwd = this.getCwdForProject(project);
    }

    if (!cwd) {
      this.badRequest(res, 'Missing cwd query parameter and no session found for project');
      return;
    }

    const files = this.discoverFiles(cwd);
    const fileInfos: ClaudeMdFileInfo[] = files.map(f => ({
      path: f.path,
      level: f.level,
      exists: f.exists,
      content: f.content,
      lineCount: f.lineCount,
      estimatedTokens: f.estimatedTokens,
      loadFrequency: f.loadFrequency,
      lastModified: f.lastModified,
    }));

    let db: any = null;
    try {
      db = this.dbManager.getSessionStore().db;
    } catch {
      // DB not available - suggestions will skip DB-based rules
    }

    const suggestions = analyzeClamdeMd(fileInfos, db);
    res.json({ suggestions });
  }

  /**
   * Get CWD from the most recent sdk_session for a project.
   * Uses multiple fallback strategies to find the project's root directory.
   */
  private getCwdForProject(project: string): string {
    // Strategy 1 (DB): Try pending_messages first (has verified cwd column)
    try {
      const db = this.dbManager.getSessionStore().db;
      const pending = db.prepare(`
        SELECT pm.cwd
        FROM pending_messages pm
        JOIN sdk_sessions s ON pm.session_db_id = s.id
        WHERE s.project = ? AND pm.cwd IS NOT NULL AND pm.cwd != ''
        ORDER BY pm.created_at_epoch DESC
        LIMIT 1
      `).get(project) as { cwd: string } | undefined;

      if (pending?.cwd) return pending.cwd;
    } catch (e) {
      logger.debug('CLAUDE_MD', 'DB CWD lookup failed', { project, error: String(e) });
    }

    // Strategy 2: Direct ~/.claude/projects/ directory scan with encoding fallback
    try {
      const claudeProjectsDir = path.join(homedir(), '.claude', 'projects');
      if (existsSync(claudeProjectsDir)) {
        const dirs = readdirSync(claudeProjectsDir);
        for (const dir of dirs) {
          // Encoded format: /Users/foo/bar → -Users-foo-bar
          // Decode: replace leading dash with /, then all dashes with /
          const decodedPath = '/' + dir.replace(/^-/, '').replace(/-/g, '/');
          const dirName = path.basename(decodedPath);
          if (dirName.toLowerCase() === project.toLowerCase() ||
              dir.toLowerCase().includes(project.toLowerCase())) {
            if (existsSync(decodedPath)) return decodedPath;

            // Encoding fallback: project names with dashes/underscores get mangled
            // Try joining last N segments with dashes and underscores
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
        }
      }
    } catch {
      // Filesystem scan failed, try other strategies
    }

    // Strategy 3: Extract CWD from observation file paths
    try {
      const db = this.dbManager.getSessionStore().db;
      const row = db.prepare(`
        SELECT files_read, files_modified
        FROM observations
        WHERE project = ? AND (files_read IS NOT NULL OR files_modified IS NOT NULL)
        ORDER BY created_at_epoch DESC
        LIMIT 5
      `).all(project) as { files_read: string | null; files_modified: string | null }[];

      for (const r of row) {
        const paths: string[] = [];
        try { if (r.files_read) paths.push(...JSON.parse(r.files_read)); } catch {}
        try { if (r.files_modified) paths.push(...JSON.parse(r.files_modified)); } catch {}

        for (const filePath of paths) {
          // Look for the project name in the path to extract CWD
          const idx = filePath.indexOf('/' + project + '/');
          if (idx >= 0) {
            const candidate = filePath.substring(0, idx + 1 + project.length);
            if (existsSync(candidate)) return candidate;
          }
        }
      }
    } catch {
      // DB query failed, try filesystem strategy
    }

    // Strategy 4: Scan ~/.claude/projects/ for matching encoded CWD
    try {
      const projectsDir = path.join(homedir(), '.claude', 'projects');
      if (existsSync(projectsDir)) {
        const dirs = readdirSync(projectsDir);
        for (const dir of dirs) {
          // Encoded format: /Users/foo/bar → -Users-foo-bar
          // Project name is basename(cwd), so dir should end with -{project}
          if (!dir.endsWith('-' + project)) continue;

          // Strip project suffix, decode prefix, reconstruct full path
          const prefix = dir.substring(0, dir.length - project.length - 1);
          const decodedPrefix = prefix.replace(/-/g, '/');
          const candidate = decodedPrefix + '/' + project;

          if (existsSync(candidate)) return candidate;
        }
      }
    } catch {
      // Filesystem scan failed
    }

    // Strategy 5: Direct common paths fallback (Desktop, Projects, home)
    for (const base of [path.join(homedir(), 'Desktop'), path.join(homedir(), 'Projects'), homedir()]) {
      const candidate = path.join(base, project);
      if (existsSync(candidate)) return candidate;
    }

    return '';
  }

  /**
   * Discover all CLAUDE.md files in the 7-level hierarchy.
   */
  private discoverFiles(cwd: string): FileDescriptor[] {
    const files: FileDescriptor[] = [];
    const home = homedir();

    // 1. Managed Policy
    const managedPath = path.join('/', 'Library', 'Application Support', 'ClaudeCode', 'CLAUDE.md');
    files.push(this.buildDescriptor(managedPath, 'managed-policy', 'every-message'));

    // 2. Project Root
    const projectRoot = path.join(cwd, 'CLAUDE.md');
    files.push(this.buildDescriptor(projectRoot, 'project-root', 'every-message'));

    // 3. Project Rules (.claude/rules/*.md)
    const rulesDir = path.join(cwd, '.claude', 'rules');
    if (existsSync(rulesDir)) {
      try {
        const ruleFiles = readdirSync(rulesDir).filter(f => f.endsWith('.md')).sort();
        for (const ruleFile of ruleFiles) {
          const rulePath = path.join(rulesDir, ruleFile);
          files.push(this.buildDescriptor(rulePath, 'project-rules', 'every-message'));
        }
      } catch {
        // Permission error or other issue - skip
      }
    } else {
      // Show the rules directory as non-existent for creation
      files.push({
        path: rulesDir,
        level: 'project-rules',
        exists: false,
        content: '',
        lineCount: 0,
        estimatedTokens: 0,
        loadFrequency: 'every-message',
        lastModified: null,
      });
    }

    // 4. User Global
    const userGlobal = path.join(home, '.claude', 'CLAUDE.md');
    files.push(this.buildDescriptor(userGlobal, 'user-global', 'every-message'));

    // 5. Project Local
    const projectLocal = path.join(cwd, 'CLAUDE.local.md');
    files.push(this.buildDescriptor(projectLocal, 'project-local', 'every-message'));

    // 6. Auto Memory
    // Hash the cwd path the same way Claude Code does for project-specific memory
    const cwdEncoded = cwd.replace(/\//g, '-');
    const memoryPath = path.join(home, '.claude', 'projects', cwdEncoded, 'memory', 'MEMORY.md');
    files.push(this.buildDescriptor(memoryPath, 'auto-memory', 'once-per-session'));

    // 7. Subdirectory CLAUDE.md files (1 level deep)
    try {
      const entries = readdirSync(cwd, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subClaudeMd = path.join(cwd, entry.name, 'CLAUDE.md');
          if (existsSync(subClaudeMd)) {
            files.push(this.buildDescriptor(subClaudeMd, 'subdirectory', 'on-demand'));
          }
        }
      }
    } catch {
      // Permission error or other issue - skip subdirectory scan
    }

    return files;
  }

  /**
   * Build a file descriptor from a path.
   */
  private buildDescriptor(
    filePath: string,
    level: string,
    loadFrequency: 'every-message' | 'once-per-session' | 'on-demand'
  ): FileDescriptor {
    if (!existsSync(filePath)) {
      return {
        path: filePath,
        level,
        exists: false,
        content: '',
        lineCount: 0,
        estimatedTokens: 0,
        loadFrequency,
        lastModified: null,
      };
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const stat = statSync(filePath);
      return {
        path: filePath,
        level,
        exists: true,
        content,
        lineCount: content.split('\n').length,
        estimatedTokens: Math.round(content.length / 4),
        loadFrequency,
        lastModified: stat.mtimeMs,
      };
    } catch {
      return {
        path: filePath,
        level,
        exists: false,
        content: '',
        lineCount: 0,
        estimatedTokens: 0,
        loadFrequency,
        lastModified: null,
      };
    }
  }

  /**
   * Validate that a file path is safe for reading/writing.
   * Must be within the user's home directory or a project directory.
   * Rejects traversal attacks and paths outside allowed boundaries.
   */
  private isPathSafe(filePath: string): boolean {
    if (!filePath) return false;

    // Must be absolute
    if (!path.isAbsolute(filePath)) return false;

    // Resolve to catch .. traversals
    const resolved = path.resolve(filePath);

    // Must be within home directory or /Library/Application Support/ClaudeCode
    const home = homedir();
    const managedDir = path.join('/', 'Library', 'Application Support', 'ClaudeCode');

    if (!resolved.startsWith(home + path.sep) &&
        resolved !== home &&
        !resolved.startsWith(managedDir + path.sep) &&
        resolved !== managedDir) {
      return false;
    }

    // Must end with .md
    if (!resolved.endsWith('.md')) return false;

    return true;
  }
}
