/**
 * Graph Routes - Knowledge Graph API endpoints
 *
 * Provides graph data built from observations, sessions, files, and tags.
 */

import express, { Request, Response } from 'express';
import { DatabaseManager } from '../../DatabaseManager.js';
import { GraphBuilder } from '../../graph/GraphBuilder.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';

export class GraphRoutes extends BaseRouteHandler {
  private graphBuilder: GraphBuilder;

  constructor(private dbManager: DatabaseManager) {
    super();
    const db = dbManager.getSessionStore().db;
    this.graphBuilder = new GraphBuilder(db);
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/graph', this.wrapHandler(this.handleGraph.bind(this)));
    app.get('/api/graph/nodes', this.wrapHandler(this.handleNodes.bind(this)));
    app.get('/api/graph/edges', this.wrapHandler(this.handleEdges.bind(this)));
  }

  private handleGraph(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const data = this.graphBuilder.build(project || undefined, limit);
    res.json(data);
  }

  private handleNodes(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const data = this.graphBuilder.build(project || undefined, limit);
    res.json({ nodes: data.nodes });
  }

  private handleEdges(req: Request, res: Response): void {
    const project = req.query.project as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const data = this.graphBuilder.build(project || undefined, limit);
    res.json({ edges: data.edges });
  }
}
