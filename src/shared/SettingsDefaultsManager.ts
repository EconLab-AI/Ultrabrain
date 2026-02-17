/**
 * SettingsDefaultsManager
 *
 * Single source of truth for all default configuration values.
 * Provides methods to get defaults with optional environment variable overrides.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { DEFAULT_OBSERVATION_TYPES_STRING, DEFAULT_OBSERVATION_CONCEPTS_STRING } from '../constants/observation-metadata.js';
// NOTE: Do NOT import logger here - it creates a circular dependency
// logger.ts depends on SettingsDefaultsManager for its initialization

export interface SettingsDefaults {
  ULTRABRAIN_MODEL: string;
  ULTRABRAIN_CONTEXT_OBSERVATIONS: string;
  ULTRABRAIN_WORKER_PORT: string;
  ULTRABRAIN_WORKER_HOST: string;
  ULTRABRAIN_SKIP_TOOLS: string;
  // AI Provider Configuration
  ULTRABRAIN_PROVIDER: string;  // 'claude' | 'gemini' | 'openrouter' | 'groq'
  ULTRABRAIN_CLAUDE_AUTH_METHOD: string;  // 'cli' | 'api' - how Claude provider authenticates
  ULTRABRAIN_ANTHROPIC_API_KEY: string;  // Anthropic API key (required when auth_method is 'api')
  ULTRABRAIN_GEMINI_API_KEY: string;
  ULTRABRAIN_GEMINI_MODEL: string;  // 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-3-flash-preview'
  ULTRABRAIN_GEMINI_RATE_LIMITING_ENABLED: string;  // 'true' | 'false' - enable rate limiting for free tier
  ULTRABRAIN_OPENROUTER_API_KEY: string;
  ULTRABRAIN_OPENROUTER_MODEL: string;
  ULTRABRAIN_OPENROUTER_SITE_URL: string;
  ULTRABRAIN_OPENROUTER_APP_NAME: string;
  ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES: string;
  ULTRABRAIN_OPENROUTER_MAX_TOKENS: string;
  ULTRABRAIN_GROQ_API_KEY: string;
  ULTRABRAIN_GROQ_MODEL: string;
  // System Configuration
  ULTRABRAIN_DATA_DIR: string;
  ULTRABRAIN_LOG_LEVEL: string;
  ULTRABRAIN_PYTHON_VERSION: string;
  CLAUDE_CODE_PATH: string;
  ULTRABRAIN_MODE: string;
  // Token Economics
  ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS: string;
  ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS: string;
  ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT: string;
  ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT: string;
  // Observation Filtering
  ULTRABRAIN_CONTEXT_OBSERVATION_TYPES: string;
  ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS: string;
  // Display Configuration
  ULTRABRAIN_CONTEXT_FULL_COUNT: string;
  ULTRABRAIN_CONTEXT_FULL_FIELD: string;
  ULTRABRAIN_CONTEXT_SESSION_COUNT: string;
  // Feature Toggles
  ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY: string;
  ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE: string;
  ULTRABRAIN_FOLDER_CLAUDEMD_ENABLED: string;
  // Exclusion Settings
  ULTRABRAIN_EXCLUDED_PROJECTS: string;  // Comma-separated glob patterns for excluded project paths
  ULTRABRAIN_FOLDER_MD_EXCLUDE: string;  // JSON array of folder paths to exclude from CLAUDE.md generation
}

export class SettingsDefaultsManager {
  /**
   * Default values for all settings
   */
  private static readonly DEFAULTS: SettingsDefaults = {
    ULTRABRAIN_MODEL: 'claude-haiku-4-5',
    ULTRABRAIN_CONTEXT_OBSERVATIONS: '50',
    ULTRABRAIN_WORKER_PORT: '37777',
    ULTRABRAIN_WORKER_HOST: '127.0.0.1',
    ULTRABRAIN_SKIP_TOOLS: 'ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion',
    // AI Provider Configuration
    ULTRABRAIN_PROVIDER: 'groq',  // Default to Groq (free tier, 14,400 req/day)
    ULTRABRAIN_CLAUDE_AUTH_METHOD: 'cli',  // Default to CLI subscription billing (not API key)
    ULTRABRAIN_ANTHROPIC_API_KEY: '',  // Empty by default, required when auth_method is 'api'
    ULTRABRAIN_GEMINI_API_KEY: '',  // Empty by default, can be set via UI or env
    ULTRABRAIN_GEMINI_MODEL: 'gemini-2.5-flash-lite',  // Default Gemini model (highest free tier RPM)
    ULTRABRAIN_GEMINI_RATE_LIMITING_ENABLED: 'true',  // Rate limiting ON by default for free tier users
    ULTRABRAIN_OPENROUTER_API_KEY: '',  // Empty by default, can be set via UI or env
    ULTRABRAIN_OPENROUTER_MODEL: 'deepseek/deepseek-r1-0528:free',  // Default OpenRouter model (DeepSeek R1 free, 164K context)
    ULTRABRAIN_OPENROUTER_SITE_URL: '',  // Optional: for OpenRouter analytics
    ULTRABRAIN_OPENROUTER_APP_NAME: 'ultrabrain',  // App name for OpenRouter analytics
    ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES: '20',  // Max messages in context window
    ULTRABRAIN_OPENROUTER_MAX_TOKENS: '100000',  // Max estimated tokens (~100k safety limit)
    ULTRABRAIN_GROQ_API_KEY: '',  // Empty by default, can be set via UI or env
    ULTRABRAIN_GROQ_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',  // Default Groq model (Llama 4 Scout, free tier)
    // System Configuration
    ULTRABRAIN_DATA_DIR: join(homedir(), '.ultrabrain'),
    ULTRABRAIN_LOG_LEVEL: 'INFO',
    ULTRABRAIN_PYTHON_VERSION: '3.13',
    CLAUDE_CODE_PATH: '', // Empty means auto-detect via 'which claude'
    ULTRABRAIN_MODE: 'code', // Default mode profile
    // Token Economics
    ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS: 'true',
    ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS: 'true',
    ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT: 'true',
    ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT: 'true',
    // Observation Filtering
    ULTRABRAIN_CONTEXT_OBSERVATION_TYPES: DEFAULT_OBSERVATION_TYPES_STRING,
    ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS: DEFAULT_OBSERVATION_CONCEPTS_STRING,
    // Display Configuration
    ULTRABRAIN_CONTEXT_FULL_COUNT: '5',
    ULTRABRAIN_CONTEXT_FULL_FIELD: 'narrative',
    ULTRABRAIN_CONTEXT_SESSION_COUNT: '10',
    // Feature Toggles
    ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY: 'true',
    ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE: 'false',
    ULTRABRAIN_FOLDER_CLAUDEMD_ENABLED: 'false',
    // Exclusion Settings
    ULTRABRAIN_EXCLUDED_PROJECTS: '',  // Comma-separated glob patterns for excluded project paths
    ULTRABRAIN_FOLDER_MD_EXCLUDE: '[]',  // JSON array of folder paths to exclude from CLAUDE.md generation
  };

  /**
   * Get all defaults as an object
   */
  static getAllDefaults(): SettingsDefaults {
    return { ...this.DEFAULTS };
  }

  /**
   * Get a default value from defaults (no environment variable override)
   */
  static get(key: keyof SettingsDefaults): string {
    return this.DEFAULTS[key];
  }

  /**
   * Get an integer default value
   */
  static getInt(key: keyof SettingsDefaults): number {
    const value = this.get(key);
    return parseInt(value, 10);
  }

  /**
   * Get a boolean default value
   * Handles both string 'true' and boolean true from JSON
   */
  static getBool(key: keyof SettingsDefaults): boolean {
    const value = this.get(key);
    return value === 'true' || value === true;
  }

  /**
   * Apply environment variable overrides to settings
   * Environment variables take highest priority over file and defaults
   */
  private static applyEnvOverrides(settings: SettingsDefaults): SettingsDefaults {
    const result = { ...settings };
    for (const key of Object.keys(this.DEFAULTS) as Array<keyof SettingsDefaults>) {
      if (process.env[key] !== undefined) {
        result[key] = process.env[key]!;
      }
    }
    return result;
  }

  /**
   * Load settings from file with fallback to defaults
   * Returns merged settings with proper priority: process.env > settings file > defaults
   * Handles all errors (missing file, corrupted JSON, permissions) gracefully
   *
   * Configuration Priority:
   *   1. Environment variables (highest priority)
   *   2. Settings file (~/.ultrabrain/settings.json)
   *   3. Default values (lowest priority)
   */
  static loadFromFile(settingsPath: string): SettingsDefaults {
    try {
      if (!existsSync(settingsPath)) {
        const defaults = this.getAllDefaults();
        try {
          const dir = dirname(settingsPath);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(settingsPath, JSON.stringify(defaults, null, 2), 'utf-8');
          // Use console instead of logger to avoid circular dependency
          console.log('[SETTINGS] Created settings file with defaults:', settingsPath);
        } catch (error) {
          console.warn('[SETTINGS] Failed to create settings file, using in-memory defaults:', settingsPath, error);
        }
        // Still apply env var overrides even when file doesn't exist
        return this.applyEnvOverrides(defaults);
      }

      const settingsData = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);

      // MIGRATION: Handle old nested schema { env: {...} }
      let flatSettings = settings;
      if (settings.env && typeof settings.env === 'object') {
        // Migrate from nested to flat schema
        flatSettings = settings.env;

        // Auto-migrate the file to flat schema
        try {
          writeFileSync(settingsPath, JSON.stringify(flatSettings, null, 2), 'utf-8');
          console.log('[SETTINGS] Migrated settings file from nested to flat schema:', settingsPath);
        } catch (error) {
          console.warn('[SETTINGS] Failed to auto-migrate settings file:', settingsPath, error);
          // Continue with in-memory migration even if write fails
        }
      }

      // Merge file settings with defaults (flat schema)
      const result: SettingsDefaults = { ...this.DEFAULTS };
      for (const key of Object.keys(this.DEFAULTS) as Array<keyof SettingsDefaults>) {
        if (flatSettings[key] !== undefined) {
          result[key] = flatSettings[key];
        }
      }

      // Apply environment variable overrides (highest priority)
      return this.applyEnvOverrides(result);
    } catch (error) {
      console.warn('[SETTINGS] Failed to load settings, using defaults:', settingsPath, error);
      // Still apply env var overrides even on error
      return this.applyEnvOverrides(this.getAllDefaults());
    }
  }
}
