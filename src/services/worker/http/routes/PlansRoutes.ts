/**
 * PlansRoutes — API endpoints for browsing Claude Code plan files
 *
 * Reads plan markdown files from ~/.claude/plans/ and project-level
 * .claude/plans/ directories. Returns structured metadata + content.
 */

import express, { Request, Response } from 'express';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { logger } from '../../../../utils/logger.js';

interface PlanFile {
  id: string;
  filename: string;
  title: string;
  path: string;
  source: 'global' | 'project';
  sizeBytes: number;
  lineCount: number;
  modifiedAt: number;
  preview: string;
}

interface PlanDetail extends PlanFile {
  content: string;
}

export class PlansRoutes extends BaseRouteHandler {
  setupRoutes(app: express.Application): void {
    app.get('/api/plans', this.wrapHandler(this.handleList.bind(this)));
    app.get('/api/plans/:id', this.wrapHandler(this.handleGet.bind(this)));
  }

  /**
   * GET /api/plans?search=...
   * List all plan files with metadata (no full content).
   */
  private handleList(req: Request, res: Response): void {
    const search = (req.query.search as string || '').toLowerCase();
    const plans: PlanFile[] = [];

    // 1. Global plans from ~/.claude/plans/
    const globalDir = path.join(homedir(), '.claude', 'plans');
    if (existsSync(globalDir)) {
      this.scanDirectory(globalDir, 'global', plans);
    }

    // Sort by modified date (newest first)
    plans.sort((a, b) => b.modifiedAt - a.modifiedAt);

    // Apply search filter
    const filtered = search
      ? plans.filter(p =>
          p.title.toLowerCase().includes(search) ||
          p.filename.toLowerCase().includes(search) ||
          p.preview.toLowerCase().includes(search)
        )
      : plans;

    res.json({ plans: filtered, total: filtered.length });
  }

  /**
   * GET /api/plans/:id
   * Get full content of a plan file by its id (base64-encoded path).
   */
  private handleGet(req: Request, res: Response): void {
    const id = req.params.id;
    let filePath: string;

    try {
      filePath = Buffer.from(id, 'base64url').toString('utf-8');
    } catch {
      this.badRequest(res, 'Invalid plan ID');
      return;
    }

    // Security: must be under ~/.claude/ and end with .md
    if (!filePath.endsWith('.md') || !filePath.startsWith(homedir())) {
      this.badRequest(res, 'Invalid plan path');
      return;
    }

    if (!existsSync(filePath)) {
      this.notFound(res, 'Plan file not found');
      return;
    }

    const content = readFileSync(filePath, 'utf-8');
    const stat = statSync(filePath);
    const filename = path.basename(filePath, '.md');

    const plan: PlanDetail = {
      id,
      filename,
      title: this.extractTitle(content, filename),
      path: filePath,
      source: 'global',
      sizeBytes: stat.size,
      lineCount: content.split('\n').length,
      modifiedAt: stat.mtimeMs,
      preview: this.extractPreview(content),
      content,
    };

    res.json({ plan });
  }

  private scanDirectory(dir: string, source: 'global' | 'project', plans: PlanFile[]): void {
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = statSync(filePath);
          const content = readFileSync(filePath, 'utf-8');
          const filename = path.basename(file, '.md');

          plans.push({
            id: Buffer.from(filePath).toString('base64url'),
            filename,
            title: this.extractTitle(content, filename),
            path: filePath,
            source,
            sizeBytes: stat.size,
            lineCount: content.split('\n').length,
            modifiedAt: stat.mtimeMs,
            preview: this.extractPreview(content),
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch (err) {
      logger.debug('PLANS', `Failed to scan ${dir}`, {}, err as Error);
    }
  }

  /**
   * Extract title from plan content (first # heading or filename).
   */
  private extractTitle(content: string, fallback: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();

    // Try ## heading
    const h2 = content.match(/^##\s+(.+)$/m);
    if (h2) return h2[1].trim();

    // Humanize filename: twinkly-knitting-sundae → Twinkly Knitting Sundae
    return fallback
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Extract first meaningful paragraph as preview (skip headings).
   */
  private extractPreview(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('---')) continue;
      if (trimmed.startsWith('```')) continue;
      // Return first non-heading, non-empty line (max 200 chars)
      return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
    }
    return '';
  }
}
