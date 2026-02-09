/**
 * GraphBuilder - Builds knowledge graph from existing database data
 *
 * Queries observations, sessions, projects, tags, and file references
 * to construct a graph of nodes and edges for visualization.
 */

import { logger } from '../../../utils/logger.js';

export interface GraphNode {
  id: string;
  type: 'file' | 'observation' | 'session' | 'project' | 'tag';
  label: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'read_by' | 'modified_by' | 'part_of' | 'tagged_with' | 'related_to';
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ObservationRow {
  id: number;
  memory_session_id: string;
  project: string;
  title: string | null;
  type: string;
  files_read: string | null;
  files_modified: string | null;
  created_at_epoch: number;
}

interface SessionRow {
  id: number;
  content_session_id: string;
  memory_session_id: string | null;
  project: string;
  started_at_epoch: number;
}

interface ItemTagRow {
  item_id: number;
  item_type: string;
  tag_name: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class GraphBuilder {
  private cache: { data: GraphData; timestamp: number; key: string } | null = null;

  constructor(private db: any) {}

  build(project?: string, limit: number = 100): GraphData {
    const cacheKey = `${project || 'all'}-${limit}`;

    // Return cached result if still fresh
    if (this.cache && this.cache.key === cacheKey && (Date.now() - this.cache.timestamp) < CACHE_TTL_MS) {
      return this.cache.data;
    }

    const nodes: Map<string, GraphNode> = new Map();
    const edges: GraphEdge[] = [];

    // 1. Query observations
    let observations: ObservationRow[];
    if (project) {
      observations = this.db.prepare(`
        SELECT id, memory_session_id, project, title, type, files_read, files_modified, created_at_epoch
        FROM observations
        WHERE project = ?
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `).all(project, limit) as ObservationRow[];
    } else {
      observations = this.db.prepare(`
        SELECT id, memory_session_id, project, title, type, files_read, files_modified, created_at_epoch
        FROM observations
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `).all(limit) as ObservationRow[];
    }

    // Track unique session IDs and projects
    const sessionIds = new Set<string>();
    const projectNames = new Set<string>();

    // 2. Create observation nodes and extract file references
    for (const obs of observations) {
      const obsId = `obs-${obs.id}`;
      nodes.set(obsId, {
        id: obsId,
        type: 'observation',
        label: obs.title || `Observation #${obs.id}`,
        metadata: {
          observationType: obs.type,
          createdAt: obs.created_at_epoch,
        },
      });

      // Track session
      if (obs.memory_session_id) {
        sessionIds.add(obs.memory_session_id);
      }

      // Track project
      projectNames.add(obs.project);

      // Parse file references
      const filesRead = this.parseFileList(obs.files_read);
      const filesModified = this.parseFileList(obs.files_modified);

      for (const file of filesRead) {
        const fileId = `file-${this.hashString(file)}`;
        if (!nodes.has(fileId)) {
          nodes.set(fileId, {
            id: fileId,
            type: 'file',
            label: this.shortenPath(file),
            metadata: { fullPath: file },
          });
        }
        edges.push({ source: fileId, target: obsId, type: 'read_by' });
      }

      for (const file of filesModified) {
        const fileId = `file-${this.hashString(file)}`;
        if (!nodes.has(fileId)) {
          nodes.set(fileId, {
            id: fileId,
            type: 'file',
            label: this.shortenPath(file),
            metadata: { fullPath: file },
          });
        }
        edges.push({ source: fileId, target: obsId, type: 'modified_by' });
      }
    }

    // 3. Create session nodes
    if (sessionIds.size > 0) {
      const placeholders = [...sessionIds].map(() => '?').join(',');
      const sessions = this.db.prepare(`
        SELECT id, content_session_id, memory_session_id, project, started_at_epoch
        FROM sdk_sessions
        WHERE memory_session_id IN (${placeholders})
      `).all(...sessionIds) as SessionRow[];

      for (const session of sessions) {
        const sessId = `session-${session.id}`;
        nodes.set(sessId, {
          id: sessId,
          type: 'session',
          label: `Session ${session.id}`,
          metadata: {
            contentSessionId: session.content_session_id,
            startedAt: session.started_at_epoch,
          },
        });

        // Create project node if needed
        const projId = `project-${this.hashString(session.project)}`;
        if (!nodes.has(projId)) {
          nodes.set(projId, {
            id: projId,
            type: 'project',
            label: this.shortenProject(session.project),
            metadata: { fullName: session.project },
          });
        }

        // Session -> Project edge
        edges.push({ source: sessId, target: projId, type: 'part_of' });
      }

      // Link observations to sessions
      for (const obs of observations) {
        if (!obs.memory_session_id) continue;
        const obsId = `obs-${obs.id}`;

        // Find session node
        const session = sessions.find(s => s.memory_session_id === obs.memory_session_id);
        if (session) {
          edges.push({ source: obsId, target: `session-${session.id}`, type: 'part_of' });
        }
      }
    }

    // 4. Create project nodes for any projects not yet added
    for (const projName of projectNames) {
      const projId = `project-${this.hashString(projName)}`;
      if (!nodes.has(projId)) {
        nodes.set(projId, {
          id: projId,
          type: 'project',
          label: this.shortenProject(projName),
          metadata: { fullName: projName },
        });
      }
    }

    // 5. Query tags for observations
    const obsIds = observations.map(o => o.id);
    if (obsIds.length > 0) {
      try {
        const tagPlaceholders = obsIds.map(() => '?').join(',');
        const itemTags = this.db.prepare(`
          SELECT it.item_id, it.item_type, t.name as tag_name
          FROM item_tags it
          JOIN tags t ON t.id = it.tag_id
          WHERE it.item_type = 'observation' AND it.item_id IN (${tagPlaceholders})
        `).all(...obsIds) as ItemTagRow[];

        for (const tag of itemTags) {
          const tagId = `tag-${this.hashString(tag.tag_name)}`;
          if (!nodes.has(tagId)) {
            nodes.set(tagId, {
              id: tagId,
              type: 'tag',
              label: tag.tag_name,
            });
          }
          edges.push({ source: `obs-${tag.item_id}`, target: tagId, type: 'tagged_with' });
        }
      } catch {
        // Tags table might not exist in all configurations
      }
    }

    const data: GraphData = {
      nodes: Array.from(nodes.values()),
      edges,
    };

    // Cache the result
    this.cache = { data, timestamp: Date.now(), key: cacheKey };

    return data;
  }

  private parseFileList(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(f => typeof f === 'string');
    } catch {
      // Try comma-separated fallback
      return raw.split(',').map(f => f.trim()).filter(Boolean);
    }
    return [];
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private shortenPath(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length <= 2) return filePath;
    return '.../' + parts.slice(-2).join('/');
  }

  private shortenProject(project: string): string {
    const parts = project.split('/');
    return parts[parts.length - 1] || project;
  }
}
