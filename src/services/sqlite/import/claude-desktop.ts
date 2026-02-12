/**
 * Claude Desktop Session Importer
 *
 * Imports local agent mode sessions from Claude Desktop into UltraBrain.
 * Sessions are stored at:
 *   ~/Library/Application Support/Claude/local-agent-mode-sessions/{org-id}/{user-id}/
 *     local_{sessionId}.json        # metadata
 *     local_{sessionId}/audit.jsonl  # conversation history
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync, readdirSync, readFile } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { logger } from '../../../utils/logger.js';
import { importSdkSession, importUserPrompt } from './bulk.js';

export interface ImportStats {
  sessionsImported: number;
  sessionsSkipped: number;
  promptsImported: number;
  errors: string[];
}

interface SessionMetadata {
  sessionId: string;
  processName?: string;
  cliSessionId?: string;
  cwd?: string;
  userSelectedFolders?: string[];
  createdAt: number;
  lastActivityAt: number;
  model?: string;
  isArchived?: boolean;
  title?: string;
  initialMessage?: string;
}

interface AuditEntry {
  type: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string }>;
  };
  _audit_timestamp?: string;
}

/**
 * Get the path to Claude Desktop's local agent mode sessions directory.
 * Returns null if the directory doesn't exist.
 */
export function getClaudeDesktopSessionsPath(): string | null {
  const base = join(
    homedir(),
    'Library',
    'Application Support',
    'Claude',
    'local-agent-mode-sessions'
  );

  if (!existsSync(base)) return null;

  // Traverse org-id/user-id structure
  try {
    const orgDirs = readdirSync(base).filter(
      (d) => !d.startsWith('.') && existsSync(join(base, d))
    );

    for (const orgDir of orgDirs) {
      const orgPath = join(base, orgDir);
      const userDirs = readdirSync(orgPath).filter(
        (d) => !d.startsWith('.') && existsSync(join(orgPath, d))
      );

      for (const userDir of userDirs) {
        const userPath = join(orgPath, userDir);
        // Check if this directory contains session JSON files
        const files = readdirSync(userPath);
        const hasSessionFiles = files.some(
          (f) => f.startsWith('local_') && f.endsWith('.json')
        );
        if (hasSessionFiles) return userPath;
      }
    }
  } catch {
    // Ignore errors traversing
  }

  return null;
}

/**
 * Derive a project name from session metadata.
 */
function deriveProject(meta: SessionMetadata): string {
  // Try userSelectedFolders first
  if (meta.userSelectedFolders && meta.userSelectedFolders.length > 0) {
    const folder = meta.userSelectedFolders[0];
    const parts = folder.split('/').filter(Boolean);
    const folderName = parts[parts.length - 1];
    if (folderName) {
      return folderName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  // Try title-based slug
  if (meta.title) {
    const slug = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    if (slug) return slug;
  }

  return 'claude-desktop';
}

/**
 * Extract user messages from audit.jsonl file.
 * Returns array of { text, timestamp } for user messages.
 */
function extractUserMessages(
  auditPath: string
): Array<{ text: string; timestamp: string }> {
  const messages: Array<{ text: string; timestamp: string }> = [];

  if (!existsSync(auditPath)) return messages;

  try {
    const content = readFileSync(auditPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const entry: AuditEntry = JSON.parse(line);
        if (entry.type !== 'user' || !entry.message) continue;

        let text: string | undefined;

        if (typeof entry.message.content === 'string') {
          text = entry.message.content;
        } else if (Array.isArray(entry.message.content)) {
          // Extract text from content array, skip tool_result entries
          const textParts = entry.message.content
            .filter(
              (c) =>
                c.type === 'text' && c.text && !('tool_use_id' in (c as any))
            )
            .map((c) => c.text!);
          if (textParts.length > 0) text = textParts.join('\n');
        }

        if (text && text.trim()) {
          messages.push({
            text: text.trim(),
            timestamp: entry._audit_timestamp || new Date().toISOString(),
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Ignore read errors
  }

  return messages;
}

/**
 * Import all Claude Desktop local agent mode sessions into UltraBrain.
 * Idempotent - re-running skips already imported sessions.
 */
export async function importClaudeDesktopSessions(
  db: Database
): Promise<ImportStats> {
  const stats: ImportStats = {
    sessionsImported: 0,
    sessionsSkipped: 0,
    promptsImported: 0,
    errors: [],
  };

  const sessionsPath = getClaudeDesktopSessionsPath();
  if (!sessionsPath) {
    stats.errors.push(
      'Claude Desktop local agent mode sessions directory not found'
    );
    return stats;
  }

  logger.info(
    'IMPORT',
    'Starting Claude Desktop session import',
    { path: sessionsPath }
  );

  // Find all session metadata files
  const files = readdirSync(sessionsPath);
  const metadataFiles = files.filter(
    (f) => f.startsWith('local_') && f.endsWith('.json')
  );

  for (const metaFile of metadataFiles) {
    const metaPath = join(sessionsPath, metaFile);

    try {
      const raw = readFileSync(metaPath, 'utf-8');
      const meta: SessionMetadata = JSON.parse(raw);

      if (!meta.sessionId || !meta.createdAt) {
        stats.errors.push(`Invalid metadata in ${metaFile}: missing required fields`);
        continue;
      }

      const project = deriveProject(meta);
      const startedAt = new Date(meta.createdAt);
      const completedAt = meta.lastActivityAt
        ? new Date(meta.lastActivityAt)
        : null;

      // Build user_prompt from title or initialMessage
      let userPrompt = meta.title || '';
      if (meta.initialMessage) {
        // Truncate very long initial messages for the summary field
        userPrompt = meta.initialMessage.slice(0, 500);
        if (meta.initialMessage.length > 500) userPrompt += '...';
      }

      // Import session
      const result = importSdkSession(db, {
        content_session_id: meta.sessionId,
        memory_session_id: meta.sessionId,
        project,
        user_prompt: userPrompt,
        started_at: startedAt.toISOString(),
        started_at_epoch: meta.createdAt,
        completed_at: completedAt ? completedAt.toISOString() : null,
        completed_at_epoch: meta.lastActivityAt || null,
        status: 'completed',
        source: 'claude-desktop',
      });

      if (!result.imported) {
        stats.sessionsSkipped++;
      } else {
        stats.sessionsImported++;
      }

      // Always import prompts — idempotent via UNIQUE constraint in importUserPrompt

      // Extract and import user prompts from audit.jsonl
      const sessionDirName = metaFile.replace('.json', '');
      const auditPath = join(sessionsPath, sessionDirName, 'audit.jsonl');
      const userMessages = extractUserMessages(auditPath);

      for (let i = 0; i < userMessages.length; i++) {
        const msg = userMessages[i];
        const promptResult = importUserPrompt(db, {
          content_session_id: meta.sessionId,
          prompt_number: i + 1,
          prompt_text: msg.text,
          created_at: msg.timestamp,
          created_at_epoch: new Date(msg.timestamp).getTime(),
        });

        if (promptResult.imported) {
          stats.promptsImported++;
        }
      }

      logger.info('IMPORT', `Imported Claude Desktop session: ${meta.title || meta.sessionId}`, {
        project,
        prompts: userMessages.length,
      });
    } catch (err) {
      const errorMsg = `Failed to import ${metaFile}: ${(err as Error).message}`;
      stats.errors.push(errorMsg);
      logger.error('IMPORT', errorMsg);
    }
  }

  logger.info('IMPORT', 'Claude Desktop import complete', {
    imported: stats.sessionsImported,
    skipped: stats.sessionsSkipped,
    prompts: stats.promptsImported,
    errors: stats.errors.length,
  });

  return stats;
}
