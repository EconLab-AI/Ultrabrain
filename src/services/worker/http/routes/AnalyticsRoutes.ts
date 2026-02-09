/**
 * Analytics Routes - Dashboard analytics API endpoints
 *
 * Provides tool usage stats, activity heatmap data, error patterns,
 * session efficiency metrics, and cross-project comparison.
 */

import express, { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { DatabaseManager } from '../../DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

interface ToolUsageRow {
  name: string;
  count: number;
}

interface ActivityRow {
  date: string;
  count: number;
}

interface ErrorTypeRow {
  type: string;
  count: number;
}

interface ProjectCompareRow {
  name: string;
  observations: number;
  sessions: number;
  lastActivity: number;
}

export class AnalyticsRoutes extends BaseRouteHandler {
  private db: any;

  constructor(private dbManager: DatabaseManager) {
    super();
    this.db = dbManager.getSessionStore().db;
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/analytics/tool-usage', this.wrapHandler(this.handleToolUsage.bind(this)));
    app.get('/api/analytics/activity', this.wrapHandler(this.handleActivity.bind(this)));
    app.get('/api/analytics/errors', this.wrapHandler(this.handleErrors.bind(this)));
    app.get('/api/analytics/efficiency', this.wrapHandler(this.handleEfficiency.bind(this)));
    app.get('/api/analytics/projects/compare', this.wrapHandler(this.handleProjectsCompare.bind(this)));
  }

  private handleToolUsage(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const days = parseInt(req.query.days as string, 10) || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const projectFilter = project ? 'AND project = ?' : '';
    const params: any[] = [cutoff, ...(project ? [project] : [])];

    // Use observation type as the tool/category breakdown
    const rows = this.db.prepare(`
      SELECT type as name, COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
        AND type IS NOT NULL AND type != ''
      GROUP BY type
      ORDER BY count DESC
    `).all(...params) as ToolUsageRow[];

    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const tools = rows.map(r => ({
      name: r.name,
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
    }));

    res.json({ tools });
  }

  private handleActivity(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const days = parseInt(req.query.days as string, 10) || 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const projectFilter = project ? 'AND project = ?' : '';
    const params: any[] = [cutoff, ...(project ? [project] : [])];

    const rows = this.db.prepare(`
      SELECT date(created_at_epoch / 1000, 'unixepoch') as date, COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
      GROUP BY date
      ORDER BY date ASC
    `).all(...params) as ActivityRow[];

    res.json({ days: rows });
  }

  private handleErrors(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const days = parseInt(req.query.days as string, 10) || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const projectFilter = project ? 'AND project = ?' : '';
    const params: any[] = [cutoff, ...(project ? [project] : [])];

    // Error type breakdown
    const errors = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
        AND (type = 'error' OR type = 'warning')
      GROUP BY type
      ORDER BY count DESC
    `).all(...params) as ErrorTypeRow[];

    // Daily error counts
    const daily = this.db.prepare(`
      SELECT date(created_at_epoch / 1000, 'unixepoch') as date, COUNT(*) as count
      FROM observations
      WHERE created_at_epoch >= ? ${projectFilter}
        AND (type = 'error' OR type = 'warning')
      GROUP BY date
      ORDER BY date ASC
    `).all(...params) as ActivityRow[];

    // Trend: compare last half vs first half of period
    const midpoint = cutoff + (days * 24 * 60 * 60 * 1000) / 2;
    const errorsWithTrend = errors.map(e => {
      const firstHalf = this.db.prepare(`
        SELECT COUNT(*) as count FROM observations
        WHERE created_at_epoch >= ? AND created_at_epoch < ? ${projectFilter}
          AND type = ?
      `).get(cutoff, midpoint, ...(project ? [project] : []), e.type) as { count: number };

      const secondHalf = this.db.prepare(`
        SELECT COUNT(*) as count FROM observations
        WHERE created_at_epoch >= ? ${projectFilter}
          AND type = ?
      `).get(midpoint, ...(project ? [project] : []), e.type) as { count: number };

      const trend = firstHalf.count > 0
        ? Math.round(((secondHalf.count - firstHalf.count) / firstHalf.count) * 100)
        : secondHalf.count > 0 ? 100 : 0;

      return { ...e, trend };
    });

    res.json({ errors: errorsWithTrend, daily });
  }

  private handleEfficiency(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const projectFilter = project ? 'WHERE project = ?' : '';
    const projectFilterAnd = project ? 'AND project = ?' : '';
    const params: any[] = project ? [project] : [];

    const sessionStats = this.db.prepare(`
      SELECT
        COUNT(*) as totalSessions,
        AVG(CASE WHEN completed_at_epoch > 0 THEN completed_at_epoch - started_at_epoch ELSE NULL END) as avgDuration
      FROM sdk_sessions
      ${projectFilter}
    `).get(...params) as { totalSessions: number; avgDuration: number | null };

    const obsCount = this.db.prepare(`
      SELECT COUNT(*) as total FROM observations ${projectFilter}
    `).get(...params) as { total: number };

    const avgObsPerSession = sessionStats.totalSessions > 0
      ? Math.round((obsCount.total / sessionStats.totalSessions) * 10) / 10
      : 0;

    res.json({
      avgSessionDuration: Math.round(sessionStats.avgDuration || 0),
      avgObservationsPerSession: avgObsPerSession,
      totalSessions: sessionStats.totalSessions,
      totalObservations: obsCount.total,
    });
  }

  private handleProjectsCompare(_req: Request, res: Response): void {
    const projects = this.db.prepare(`
      SELECT
        project as name,
        COUNT(*) as observations,
        MAX(created_at_epoch) as lastActivity
      FROM observations
      WHERE project IS NOT NULL AND project != ''
      GROUP BY project
      ORDER BY observations DESC
    `).all() as { name: string; observations: number; lastActivity: number }[];

    const result = projects.map(p => {
      const sessionCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM sdk_sessions WHERE project = ?
      `).get(p.name) as { count: number };

      return {
        name: p.name,
        observations: p.observations,
        sessions: sessionCount.count,
        lastActivity: p.lastActivity,
      };
    });

    res.json({ projects: result });
  }
}
