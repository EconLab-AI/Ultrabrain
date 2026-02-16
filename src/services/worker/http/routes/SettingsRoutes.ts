/**
 * Settings Routes
 *
 * Handles settings management, MCP toggle, and branch switching.
 * Settings are stored in ~/.ultrabrain/settings.json
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { getPackageRoot } from '../../../../shared/paths.js';
import { logger } from '../../../../utils/logger.js';
import { SettingsManager } from '../../SettingsManager.js';
import { getBranchInfo, switchBranch, pullUpdates } from '../../BranchManager.js';
import { ModeManager } from '../../domain/ModeManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { SettingsDefaultsManager } from '../../../../shared/SettingsDefaultsManager.js';
import { clearPortCache } from '../../../../shared/worker-utils.js';
import { saveUltraBrainEnv, loadUltraBrainEnv } from '../../../../shared/EnvManager.js';

export class SettingsRoutes extends BaseRouteHandler {
  constructor(
    private settingsManager: SettingsManager
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    // Settings endpoints
    app.get('/api/settings', this.handleGetSettings.bind(this));
    app.post('/api/settings', this.handleUpdateSettings.bind(this));

    // MCP toggle endpoints
    app.get('/api/mcp/status', this.handleGetMcpStatus.bind(this));
    app.post('/api/mcp/toggle', this.handleToggleMcp.bind(this));

    // Branch switching endpoints
    app.get('/api/branch/status', this.handleGetBranchStatus.bind(this));
    app.post('/api/branch/switch', this.handleSwitchBranch.bind(this));
    app.post('/api/branch/update', this.handleUpdateBranch.bind(this));
  }

  /**
   * Get environment settings (from ~/.ultrabrain/settings.json)
   */
  private handleGetSettings = this.wrapHandler((req: Request, res: Response): void => {
    const settingsPath = path.join(homedir(), '.ultrabrain', 'settings.json');
    this.ensureSettingsFile(settingsPath);
    const settings: any = SettingsDefaultsManager.loadFromFile(settingsPath);

    // Merge API keys from .env (source of truth for credentials)
    try {
      const envCredentials = loadUltraBrainEnv();
      if (envCredentials.ANTHROPIC_API_KEY) {
        settings.ULTRABRAIN_ANTHROPIC_API_KEY = envCredentials.ANTHROPIC_API_KEY;
      }
      if (envCredentials.GEMINI_API_KEY) {
        settings.ULTRABRAIN_GEMINI_API_KEY = envCredentials.GEMINI_API_KEY;
      }
      if (envCredentials.OPENROUTER_API_KEY) {
        settings.ULTRABRAIN_OPENROUTER_API_KEY = envCredentials.OPENROUTER_API_KEY;
      }
      if (envCredentials.GROQ_API_KEY) {
        settings.ULTRABRAIN_GROQ_API_KEY = envCredentials.GROQ_API_KEY;
      }
    } catch {
      // .env read failed, use settings.json values
    }

    res.json(settings);
  });

  /**
   * Update environment settings (in ~/.ultrabrain/settings.json) with validation
   */
  private handleUpdateSettings = this.wrapHandler((req: Request, res: Response): void => {
    // Validate all settings
    const validation = this.validateSettings(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error
      });
      return;
    }

    // Read existing settings
    const settingsPath = path.join(homedir(), '.ultrabrain', 'settings.json');
    this.ensureSettingsFile(settingsPath);
    let settings: any = {};

    if (existsSync(settingsPath)) {
      const settingsData = readFileSync(settingsPath, 'utf-8');
      try {
        settings = JSON.parse(settingsData);
      } catch (parseError) {
        logger.error('SETTINGS', 'Failed to parse settings file', { settingsPath }, parseError as Error);
        res.status(500).json({
          success: false,
          error: 'Settings file is corrupted. Delete ~/.ultrabrain/settings.json to reset.'
        });
        return;
      }
    }

    // Update all settings from request body
    const settingKeys = [
      'ULTRABRAIN_MODEL',
      'ULTRABRAIN_CONTEXT_OBSERVATIONS',
      'ULTRABRAIN_WORKER_PORT',
      'ULTRABRAIN_WORKER_HOST',
      // AI Provider Configuration
      'ULTRABRAIN_PROVIDER',
      'ULTRABRAIN_CLAUDE_AUTH_METHOD',
      'ULTRABRAIN_ANTHROPIC_API_KEY',
      'ULTRABRAIN_GEMINI_API_KEY',
      'ULTRABRAIN_GEMINI_MODEL',
      'ULTRABRAIN_GEMINI_RATE_LIMITING_ENABLED',
      // OpenRouter Configuration
      'ULTRABRAIN_OPENROUTER_API_KEY',
      'ULTRABRAIN_OPENROUTER_MODEL',
      'ULTRABRAIN_OPENROUTER_SITE_URL',
      'ULTRABRAIN_OPENROUTER_APP_NAME',
      'ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES',
      'ULTRABRAIN_OPENROUTER_MAX_TOKENS',
      // Groq Configuration
      'ULTRABRAIN_GROQ_API_KEY',
      'ULTRABRAIN_GROQ_MODEL',
      // System Configuration
      'ULTRABRAIN_DATA_DIR',
      'ULTRABRAIN_LOG_LEVEL',
      'ULTRABRAIN_PYTHON_VERSION',
      'CLAUDE_CODE_PATH',
      // Token Economics
      'ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS',
      'ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS',
      'ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT',
      'ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT',
      // Observation Filtering
      'ULTRABRAIN_CONTEXT_OBSERVATION_TYPES',
      'ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS',
      // Display Configuration
      'ULTRABRAIN_CONTEXT_FULL_COUNT',
      'ULTRABRAIN_CONTEXT_FULL_FIELD',
      'ULTRABRAIN_CONTEXT_SESSION_COUNT',
      // Feature Toggles
      'ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY',
      'ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE',
      'ULTRABRAIN_FOLDER_CLAUDEMD_ENABLED',
    ];

    for (const key of settingKeys) {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    }

    // Write back
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    // Sync API keys to ~/.ultrabrain/.env (where SDK reads them from)
    try {
      const envUpdate: Record<string, string | undefined> = {};
      if (req.body.ULTRABRAIN_ANTHROPIC_API_KEY !== undefined) {
        envUpdate.ANTHROPIC_API_KEY = req.body.ULTRABRAIN_ANTHROPIC_API_KEY || undefined;
      }
      if (req.body.ULTRABRAIN_GEMINI_API_KEY !== undefined) {
        envUpdate.GEMINI_API_KEY = req.body.ULTRABRAIN_GEMINI_API_KEY || undefined;
      }
      if (req.body.ULTRABRAIN_OPENROUTER_API_KEY !== undefined) {
        envUpdate.OPENROUTER_API_KEY = req.body.ULTRABRAIN_OPENROUTER_API_KEY || undefined;
      }
      if (req.body.ULTRABRAIN_GROQ_API_KEY !== undefined) {
        envUpdate.GROQ_API_KEY = req.body.ULTRABRAIN_GROQ_API_KEY || undefined;
      }
      if (Object.keys(envUpdate).length > 0) {
        saveUltraBrainEnv(envUpdate as any);
        logger.info('SETTINGS', 'API keys synced to .env file');
      }
    } catch (envError) {
      logger.warn('SETTINGS', 'Failed to sync API keys to .env', {}, envError as Error);
    }

    // Clear port cache to force re-reading from updated settings
    clearPortCache();

    logger.info('WORKER', 'Settings updated');
    res.json({ success: true, message: 'Settings updated successfully' });
  });

  /**
   * GET /api/mcp/status - Check if MCP search server is enabled
   */
  private handleGetMcpStatus = this.wrapHandler((req: Request, res: Response): void => {
    const enabled = this.isMcpEnabled();
    res.json({ enabled });
  });

  /**
   * POST /api/mcp/toggle - Toggle MCP search server on/off
   * Body: { enabled: boolean }
   */
  private handleToggleMcp = this.wrapHandler((req: Request, res: Response): void => {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      this.badRequest(res, 'enabled must be a boolean');
      return;
    }

    this.toggleMcp(enabled);
    res.json({ success: true, enabled: this.isMcpEnabled() });
  });

  /**
   * GET /api/branch/status - Get current branch information
   */
  private handleGetBranchStatus = this.wrapHandler((req: Request, res: Response): void => {
    const info = getBranchInfo();
    res.json(info);
  });

  /**
   * POST /api/branch/switch - Switch to a different branch
   * Body: { branch: "main" | "beta/7.0" }
   */
  private handleSwitchBranch = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { branch } = req.body;

    if (!branch) {
      res.status(400).json({ success: false, error: 'Missing branch parameter' });
      return;
    }

    // Validate branch name
    const allowedBranches = ['main', 'beta/7.0', 'feature/bun-executable'];
    if (!allowedBranches.includes(branch)) {
      res.status(400).json({
        success: false,
        error: `Invalid branch. Allowed: ${allowedBranches.join(', ')}`
      });
      return;
    }

    logger.info('WORKER', 'Branch switch requested', { branch });

    const result = await switchBranch(branch);

    if (result.success) {
      // Schedule worker restart after response is sent
      setTimeout(() => {
        logger.info('WORKER', 'Restarting worker after branch switch');
        process.exit(0); // PM2 will restart the worker
      }, 1000);
    }

    res.json(result);
  });

  /**
   * POST /api/branch/update - Pull latest updates for current branch
   */
  private handleUpdateBranch = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    logger.info('WORKER', 'Branch update requested');

    const result = await pullUpdates();

    if (result.success) {
      // Schedule worker restart after response is sent
      setTimeout(() => {
        logger.info('WORKER', 'Restarting worker after branch update');
        process.exit(0); // PM2 will restart the worker
      }, 1000);
    }

    res.json(result);
  });

  /**
   * Validate all settings from request body (single source of truth)
   */
  private validateSettings(settings: any): { valid: boolean; error?: string } {
    // Validate ULTRABRAIN_PROVIDER
    if (settings.ULTRABRAIN_PROVIDER) {
    const validProviders = ['claude', 'gemini', 'openrouter'];
    if (!validProviders.includes(settings.ULTRABRAIN_PROVIDER)) {
      return { valid: false, error: 'ULTRABRAIN_PROVIDER must be "claude", "gemini", or "openrouter"' };
      }
    }

    // Validate ULTRABRAIN_CLAUDE_AUTH_METHOD
    if (settings.ULTRABRAIN_CLAUDE_AUTH_METHOD) {
      const validMethods = ['cli', 'api'];
      if (!validMethods.includes(settings.ULTRABRAIN_CLAUDE_AUTH_METHOD)) {
        return { valid: false, error: 'ULTRABRAIN_CLAUDE_AUTH_METHOD must be "cli" or "api"' };
      }
    }

    // Validate ULTRABRAIN_GEMINI_MODEL
    if (settings.ULTRABRAIN_GEMINI_MODEL) {
      const validGeminiModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview'];
      if (!validGeminiModels.includes(settings.ULTRABRAIN_GEMINI_MODEL)) {
        return { valid: false, error: 'ULTRABRAIN_GEMINI_MODEL must be one of: gemini-2.5-flash-lite, gemini-2.5-flash, gemini-3-flash-preview' };
      }
    }

    // Validate ULTRABRAIN_CONTEXT_OBSERVATIONS
    if (settings.ULTRABRAIN_CONTEXT_OBSERVATIONS) {
      const obsCount = parseInt(settings.ULTRABRAIN_CONTEXT_OBSERVATIONS, 10);
      if (isNaN(obsCount) || obsCount < 1 || obsCount > 200) {
        return { valid: false, error: 'ULTRABRAIN_CONTEXT_OBSERVATIONS must be between 1 and 200' };
      }
    }

    // Validate ULTRABRAIN_WORKER_PORT
    if (settings.ULTRABRAIN_WORKER_PORT) {
      const port = parseInt(settings.ULTRABRAIN_WORKER_PORT, 10);
      if (isNaN(port) || port < 1024 || port > 65535) {
        return { valid: false, error: 'ULTRABRAIN_WORKER_PORT must be between 1024 and 65535' };
      }
    }

    // Validate ULTRABRAIN_WORKER_HOST (IP address or 0.0.0.0)
    if (settings.ULTRABRAIN_WORKER_HOST) {
      const host = settings.ULTRABRAIN_WORKER_HOST;
      // Allow localhost variants and valid IP patterns
      const validHostPattern = /^(127\.0\.0\.1|0\.0\.0\.0|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
      if (!validHostPattern.test(host)) {
        return { valid: false, error: 'ULTRABRAIN_WORKER_HOST must be a valid IP address (e.g., 127.0.0.1, 0.0.0.0)' };
      }
    }

    // Validate ULTRABRAIN_LOG_LEVEL
    if (settings.ULTRABRAIN_LOG_LEVEL) {
      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT'];
      if (!validLevels.includes(settings.ULTRABRAIN_LOG_LEVEL.toUpperCase())) {
        return { valid: false, error: 'ULTRABRAIN_LOG_LEVEL must be one of: DEBUG, INFO, WARN, ERROR, SILENT' };
      }
    }

    // Validate ULTRABRAIN_PYTHON_VERSION (must be valid Python version format)
    if (settings.ULTRABRAIN_PYTHON_VERSION) {
      const pythonVersionRegex = /^3\.\d{1,2}$/;
      if (!pythonVersionRegex.test(settings.ULTRABRAIN_PYTHON_VERSION)) {
        return { valid: false, error: 'ULTRABRAIN_PYTHON_VERSION must be in format "3.X" or "3.XX" (e.g., "3.13")' };
      }
    }

    // Validate boolean string values
    const booleanSettings = [
      'ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS',
      'ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS',
      'ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT',
      'ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT',
      'ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY',
      'ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE',
    ];

    for (const key of booleanSettings) {
      if (settings[key] && !['true', 'false'].includes(settings[key])) {
        return { valid: false, error: `${key} must be "true" or "false"` };
      }
    }

    // Validate FULL_COUNT (0-20)
    if (settings.ULTRABRAIN_CONTEXT_FULL_COUNT) {
      const count = parseInt(settings.ULTRABRAIN_CONTEXT_FULL_COUNT, 10);
      if (isNaN(count) || count < 0 || count > 20) {
        return { valid: false, error: 'ULTRABRAIN_CONTEXT_FULL_COUNT must be between 0 and 20' };
      }
    }

    // Validate SESSION_COUNT (1-50)
    if (settings.ULTRABRAIN_CONTEXT_SESSION_COUNT) {
      const count = parseInt(settings.ULTRABRAIN_CONTEXT_SESSION_COUNT, 10);
      if (isNaN(count) || count < 1 || count > 50) {
        return { valid: false, error: 'ULTRABRAIN_CONTEXT_SESSION_COUNT must be between 1 and 50' };
      }
    }

    // Validate FULL_FIELD
    if (settings.ULTRABRAIN_CONTEXT_FULL_FIELD) {
      if (!['narrative', 'facts'].includes(settings.ULTRABRAIN_CONTEXT_FULL_FIELD)) {
        return { valid: false, error: 'ULTRABRAIN_CONTEXT_FULL_FIELD must be "narrative" or "facts"' };
      }
    }

    // Validate ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES
    if (settings.ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES) {
      const count = parseInt(settings.ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES, 10);
      if (isNaN(count) || count < 1 || count > 100) {
        return { valid: false, error: 'ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES must be between 1 and 100' };
      }
    }

    // Validate ULTRABRAIN_OPENROUTER_MAX_TOKENS
    if (settings.ULTRABRAIN_OPENROUTER_MAX_TOKENS) {
      const tokens = parseInt(settings.ULTRABRAIN_OPENROUTER_MAX_TOKENS, 10);
      if (isNaN(tokens) || tokens < 1000 || tokens > 1000000) {
        return { valid: false, error: 'ULTRABRAIN_OPENROUTER_MAX_TOKENS must be between 1000 and 1000000' };
      }
    }

    // Validate ULTRABRAIN_OPENROUTER_SITE_URL if provided
    if (settings.ULTRABRAIN_OPENROUTER_SITE_URL) {
      try {
        new URL(settings.ULTRABRAIN_OPENROUTER_SITE_URL);
      } catch (error) {
        // Invalid URL format
        logger.debug('SETTINGS', 'Invalid URL format', { url: settings.ULTRABRAIN_OPENROUTER_SITE_URL, error: error instanceof Error ? error.message : String(error) });
        return { valid: false, error: 'ULTRABRAIN_OPENROUTER_SITE_URL must be a valid URL' };
      }
    }

    // Skip observation types validation - any type string is valid since modes define their own types
    // The database accepts any TEXT value, and mode-specific validation happens at parse time

    // Skip observation concepts validation - any concept string is valid since modes define their own concepts
    // The database accepts any TEXT value, and mode-specific validation happens at parse time

    return { valid: true };
  }

  /**
   * Check if MCP search server is enabled
   */
  private isMcpEnabled(): boolean {
    const packageRoot = getPackageRoot();
    const mcpPath = path.join(packageRoot, 'plugin', '.mcp.json');
    return existsSync(mcpPath);
  }

  /**
   * Toggle MCP search server (rename .mcp.json <-> .mcp.json.disabled)
   */
  private toggleMcp(enabled: boolean): void {
    const packageRoot = getPackageRoot();
    const mcpPath = path.join(packageRoot, 'plugin', '.mcp.json');
    const mcpDisabledPath = path.join(packageRoot, 'plugin', '.mcp.json.disabled');

    if (enabled && existsSync(mcpDisabledPath)) {
      // Enable: rename .mcp.json.disabled -> .mcp.json
      renameSync(mcpDisabledPath, mcpPath);
      logger.info('WORKER', 'MCP search server enabled');
    } else if (!enabled && existsSync(mcpPath)) {
      // Disable: rename .mcp.json -> .mcp.json.disabled
      renameSync(mcpPath, mcpDisabledPath);
      logger.info('WORKER', 'MCP search server disabled');
    } else {
      logger.debug('WORKER', 'MCP toggle no-op (already in desired state)', { enabled });
    }
  }

  /**
   * Ensure settings file exists, creating with defaults if missing
   */
  private ensureSettingsFile(settingsPath: string): void {
    if (!existsSync(settingsPath)) {
      const defaults = SettingsDefaultsManager.getAllDefaults();

      // Ensure directory exists
      const dir = path.dirname(settingsPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(settingsPath, JSON.stringify(defaults, null, 2), 'utf-8');
      logger.info('SETTINGS', 'Created settings file with defaults', { settingsPath });
    }
  }
}
