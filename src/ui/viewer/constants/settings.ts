/**
 * Default settings values for UltraBrain
 * Shared across UI components and hooks
 */
export const DEFAULT_SETTINGS = {
  ULTRABRAIN_MODEL: 'claude-sonnet-4-5',
  ULTRABRAIN_CONTEXT_OBSERVATIONS: '50',
  ULTRABRAIN_WORKER_PORT: '37777',
  ULTRABRAIN_WORKER_HOST: '127.0.0.1',

  // AI Provider Configuration
  ULTRABRAIN_PROVIDER: 'claude',
  ULTRABRAIN_GEMINI_API_KEY: '',
  ULTRABRAIN_GEMINI_MODEL: 'gemini-2.5-flash-lite',
  ULTRABRAIN_OPENROUTER_API_KEY: '',
  ULTRABRAIN_OPENROUTER_MODEL: 'xiaomi/mimo-v2-flash:free',
  ULTRABRAIN_OPENROUTER_SITE_URL: '',
  ULTRABRAIN_OPENROUTER_APP_NAME: 'ultrabrain',
  ULTRABRAIN_GEMINI_RATE_LIMITING_ENABLED: 'true',

  // Token Economics (all true for backwards compatibility)
  ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS: 'true',
  ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS: 'true',
  ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT: 'true',
  ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT: 'true',

  // Observation Filtering (all types and concepts)
  ULTRABRAIN_CONTEXT_OBSERVATION_TYPES: 'bugfix,feature,refactor,discovery,decision,change',
  ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS: 'how-it-works,why-it-exists,what-changed,problem-solution,gotcha,pattern,trade-off',

  // Display Configuration
  ULTRABRAIN_CONTEXT_FULL_COUNT: '5',
  ULTRABRAIN_CONTEXT_FULL_FIELD: 'narrative',
  ULTRABRAIN_CONTEXT_SESSION_COUNT: '10',

  // Feature Toggles
  ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY: 'true',
  ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE: 'false',

  // Exclusion Settings
  ULTRABRAIN_EXCLUDED_PROJECTS: '',
  ULTRABRAIN_FOLDER_MD_EXCLUDE: '[]',
} as const;
