import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { TerminalManager } from '../../terminal/TerminalManager.js';

export class TerminalRoutes extends BaseRouteHandler {
  constructor(private terminalManager: TerminalManager) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/terminals', this.wrapHandler(this.handleList.bind(this)));
    app.post('/api/terminals', this.wrapHandler(this.handleCreate.bind(this)));
    app.delete('/api/terminals/:id', this.wrapHandler(this.handleDestroy.bind(this)));
    app.post('/api/terminals/:id/resize', this.wrapHandler(this.handleResize.bind(this)));
    app.get('/api/terminals/:id/scrollback', this.wrapHandler(this.handleScrollback.bind(this)));
  }

  private handleList(_req: Request, res: Response): void {
    const terminals = this.terminalManager.listTerminals();
    res.json({ terminals });
  }

  private handleCreate(req: Request, res: Response): void {
    const { shell, cwd, project, cols, rows } = req.body || {};

    const terminal = this.terminalManager.spawn(shell, cwd, cols, rows, project);
    res.status(201).json({ terminal: terminal.metadata });
  }

  private handleDestroy(req: Request, res: Response): void {
    const { id } = req.params;
    const ok = this.terminalManager.destroy(id);
    if (!ok) {
      this.notFound(res, `Terminal not found: ${id}`);
      return;
    }
    res.json({ success: true });
  }

  private handleResize(req: Request, res: Response): void {
    const { id } = req.params;
    const { cols, rows } = req.body || {};

    if (!cols || !rows) {
      this.badRequest(res, 'Missing cols or rows');
      return;
    }

    const ok = this.terminalManager.resize(id, cols, rows);
    if (!ok) {
      this.notFound(res, `Terminal not found or not alive: ${id}`);
      return;
    }
    res.json({ success: true });
  }

  private handleScrollback(req: Request, res: Response): void {
    const { id } = req.params;
    const terminal = this.terminalManager.getTerminal(id);
    if (!terminal) {
      this.notFound(res, `Terminal not found: ${id}`);
      return;
    }
    res.json({ scrollback: this.terminalManager.getScrollback(id) });
  }
}
