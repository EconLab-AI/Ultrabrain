/**
 * ContextConfigLoader - Loads and validates context configuration
 *
 * Handles loading settings from file with mode-based filtering for observation types.
 */

import path from 'path';
import { homedir } from 'os';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import { ModeManager } from '../domain/ModeManager.js';
import type { ContextConfig } from './types.js';

/**
 * Load all context configuration settings
 * Priority: ~/.ultrabrain/settings.json > env var > defaults
 */
export function loadContextConfig(): ContextConfig {
  const settingsPath = path.join(homedir(), '.ultrabrain', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);

  // For non-code modes, use all types/concepts from active mode instead of settings
  const modeId = settings.ULTRABRAIN_MODE;
  const isCodeMode = modeId === 'code' || modeId.startsWith('code--');

  let observationTypes: Set<string>;
  let observationConcepts: Set<string>;

  if (isCodeMode) {
    // Code mode: use settings-based filtering
    observationTypes = new Set(
      settings.ULTRABRAIN_CONTEXT_OBSERVATION_TYPES.split(',').map((t: string) => t.trim()).filter(Boolean)
    );
    observationConcepts = new Set(
      settings.ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS.split(',').map((c: string) => c.trim()).filter(Boolean)
    );
  } else {
    // Non-code modes: use all types/concepts from active mode
    const mode = ModeManager.getInstance().getActiveMode();
    observationTypes = new Set(mode.observation_types.map(t => t.id));
    observationConcepts = new Set(mode.observation_concepts.map(c => c.id));
  }

  return {
    totalObservationCount: parseInt(settings.ULTRABRAIN_CONTEXT_OBSERVATIONS, 10),
    fullObservationCount: parseInt(settings.ULTRABRAIN_CONTEXT_FULL_COUNT, 10),
    sessionCount: parseInt(settings.ULTRABRAIN_CONTEXT_SESSION_COUNT, 10),
    showReadTokens: settings.ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS === 'true',
    showWorkTokens: settings.ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS === 'true',
    showSavingsAmount: settings.ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT === 'true',
    showSavingsPercent: settings.ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT === 'true',
    observationTypes,
    observationConcepts,
    fullObservationField: settings.ULTRABRAIN_CONTEXT_FULL_FIELD as 'narrative' | 'facts',
    showLastSummary: settings.ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY === 'true',
    showLastMessage: settings.ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE === 'true',
  };
}
