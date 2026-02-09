/**
 * Teams Routes - Agent Teams API endpoints
 *
 * Read-only endpoint that discovers Claude Code Agent Teams
 * from ~/.claude/teams/ and ~/.claude/tasks/ filesystem directories.
 */

import express, { Request, Response } from 'express';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { logger } from '../../../../utils/logger.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

interface TeamMember {
  name: string;
  agentId: string;
  agentType: string;
}

interface TeamResponse {
  name: string;
  members: TeamMember[];
  taskCount: number;
  completedTasks: number;
}

export class TeamsRoutes extends BaseRouteHandler {
  setupRoutes(app: express.Application): void {
    app.get('/api/teams', this.wrapHandler(this.handleGetTeams.bind(this)));
  }

  private handleGetTeams(_req: Request, res: Response): void {
    const teamsDir = path.join(homedir(), '.claude', 'teams');
    const tasksDir = path.join(homedir(), '.claude', 'tasks');
    const teams: TeamResponse[] = [];

    if (!existsSync(teamsDir)) {
      res.json({ teams: [] });
      return;
    }

    let teamDirs: string[];
    try {
      teamDirs = readdirSync(teamsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch (err) {
      logger.error('HTTP', 'Failed to read teams directory', {}, err as Error);
      res.json({ teams: [] });
      return;
    }

    for (const teamName of teamDirs) {
      const configPath = path.join(teamsDir, teamName, 'config.json');
      if (!existsSync(configPath)) continue;

      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        const members: TeamMember[] = (config.members || []).map((m: any) => ({
          name: m.name || 'unnamed',
          agentId: m.agentId || m.agent_id || '',
          agentType: m.agentType || m.agent_type || m.role || 'agent',
        }));

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

        teams.push({
          name: teamName,
          members,
          taskCount,
          completedTasks,
        });
      } catch {
        logger.warn('HTTP', `Skipping malformed team config: ${teamName}`);
      }
    }

    res.json({ teams });
  }
}
