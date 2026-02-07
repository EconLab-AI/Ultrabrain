/**
 * LanceSync Service
 *
 * LanceSync: syncs observations, summaries, and user prompts
 * to LanceDB for semantic vector search. Runs fully in-process with no
 * MCP subprocess overhead.
 *
 * Design: Fail-fast with no fallbacks - if LanceDB is unavailable, syncing fails.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { ParsedObservation, ParsedSummary } from '../../sdk/parser.js';
import { SessionStore } from '../sqlite/SessionStore.js';
import { logger } from '../../utils/logger.js';
import { embeddingService } from './EmbeddingService.js';

// ── Internal types for stored row shapes ──────────────

interface StoredObservation {
  id: number;
  memory_session_id: string;
  project: string;
  text: string | null;
  type: string;
  title: string | null;
  subtitle: string | null;
  facts: string | null;
  narrative: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  prompt_number: number;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
}

interface StoredSummary {
  id: number;
  memory_session_id: string;
  project: string;
  request: string | null;
  investigated: string | null;
  learned: string | null;
  completed: string | null;
  next_steps: string | null;
  notes: string | null;
  prompt_number: number;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
}

interface StoredUserPrompt {
  id: number;
  content_session_id: string;
  prompt_number: number;
  prompt_text: string;
  created_at: string;
  created_at_epoch: number;
  memory_session_id: string;
  project: string;
}

interface LanceDocument {
  id: string;
  text: string;
  vector: number[];
  sqlite_id: number;
  doc_type: string;
  memory_session_id: string;
  project: string;
  created_at_epoch: number;
  field_type: string;
  type: string;
  title: string;
}

// ── LanceSync class ─────────────────────────────────────────────────────

export class LanceSync {
  private db: any = null;
  private table: any = null;
  private project: string;
  private tableName: string;
  private readonly VECTOR_DB_DIR: string;
  private readonly BATCH_SIZE = 100;
  private connecting: Promise<void> | null = null;

  constructor(project: string) {
    this.project = project;
    this.tableName = `ub__${project}`;
    this.VECTOR_DB_DIR = path.join(os.homedir(), '.ultrabrain', 'vector-db');
  }

  /**
   * LanceDB runs in-process -- no Windows limitation
   */
  isDisabled(): boolean {
    return false;
  }

  // ── Connection management ───────────────────────────────────────────

  private async ensureConnection(): Promise<void> {
    if (this.db && this.table) return;

    if (this.connecting) {
      await this.connecting;
      return;
    }

    this.connecting = (async () => {
      try {
        // Ensure directory exists
        fs.mkdirSync(this.VECTOR_DB_DIR, { recursive: true });

        const lancedb = await import('@lancedb/lancedb');
        this.db = await lancedb.connect(this.VECTOR_DB_DIR);

        // Try to open existing table
        const tables = await this.db.tableNames();
        if (tables.includes(this.tableName)) {
          this.table = await this.db.openTable(this.tableName);
          logger.debug('LANCE', 'Opened existing LanceDB table', { table: this.tableName });
        } else {
          this.table = null; // Will be created on first insert
          logger.debug('LANCE', 'LanceDB table does not exist yet', { table: this.tableName });
        }

        logger.info('LANCE', 'Connected to LanceDB', { project: this.project, dir: this.VECTOR_DB_DIR });
      } catch (error) {
        this.db = null;
        this.table = null;
        this.connecting = null;
        logger.error('LANCE', 'Failed to connect to LanceDB', { project: this.project }, error as Error);
        throw new Error(`LanceDB connection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    await this.connecting;
  }

  /**
   * Create the table with the first batch of documents, or add to existing table
   */
  private async addDocuments(docs: LanceDocument[]): Promise<void> {
    if (docs.length === 0) return;

    await this.ensureConnection();

    try {
      if (!this.table) {
        // Create table with first batch
        this.table = await this.db.createTable(this.tableName, docs);
        logger.info('LANCE', 'Created LanceDB table', { table: this.tableName, rows: docs.length });
      } else {
        await this.table.add(docs);
        logger.debug('LANCE', 'Added documents to LanceDB', { table: this.tableName, count: docs.length });
      }
    } catch (error) {
      logger.error('LANCE', 'Failed to add documents to LanceDB', {
        table: this.tableName,
        count: docs.length
      }, error as Error);
      throw new Error(`LanceDB add failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── Document formatting ────────────────

  private formatObservationDocs(obs: StoredObservation): Omit<LanceDocument, 'vector'>[] {
    const docs: Omit<LanceDocument, 'vector'>[] = [];

    const base = {
      sqlite_id: obs.id,
      doc_type: 'observation',
      memory_session_id: obs.memory_session_id,
      project: obs.project,
      created_at_epoch: obs.created_at_epoch,
      type: obs.type || 'discovery',
      title: obs.title || 'Untitled',
    };

    if (obs.narrative) {
      docs.push({ ...base, id: `obs_${obs.id}_narrative`, text: obs.narrative, field_type: 'narrative' });
    }

    if (obs.text) {
      docs.push({ ...base, id: `obs_${obs.id}_text`, text: obs.text, field_type: 'text' });
    }

    const facts: string[] = obs.facts ? JSON.parse(obs.facts) : [];
    facts.forEach((fact: string, index: number) => {
      docs.push({ ...base, id: `obs_${obs.id}_fact_${index}`, text: fact, field_type: 'fact' });
    });

    return docs;
  }

  private formatSummaryDocs(summary: StoredSummary): Omit<LanceDocument, 'vector'>[] {
    const docs: Omit<LanceDocument, 'vector'>[] = [];

    const base = {
      sqlite_id: summary.id,
      doc_type: 'session_summary',
      memory_session_id: summary.memory_session_id,
      project: summary.project,
      created_at_epoch: summary.created_at_epoch,
      type: '',
      title: '',
    };

    if (summary.request) {
      docs.push({ ...base, id: `summary_${summary.id}_request`, text: summary.request, field_type: 'request' });
    }
    if (summary.investigated) {
      docs.push({ ...base, id: `summary_${summary.id}_investigated`, text: summary.investigated, field_type: 'investigated' });
    }
    if (summary.learned) {
      docs.push({ ...base, id: `summary_${summary.id}_learned`, text: summary.learned, field_type: 'learned' });
    }
    if (summary.completed) {
      docs.push({ ...base, id: `summary_${summary.id}_completed`, text: summary.completed, field_type: 'completed' });
    }
    if (summary.next_steps) {
      docs.push({ ...base, id: `summary_${summary.id}_next_steps`, text: summary.next_steps, field_type: 'next_steps' });
    }
    if (summary.notes) {
      docs.push({ ...base, id: `summary_${summary.id}_notes`, text: summary.notes, field_type: 'notes' });
    }

    return docs;
  }

  private formatUserPromptDoc(prompt: StoredUserPrompt): Omit<LanceDocument, 'vector'> {
    return {
      id: `prompt_${prompt.id}`,
      text: prompt.prompt_text,
      sqlite_id: prompt.id,
      doc_type: 'user_prompt',
      memory_session_id: prompt.memory_session_id,
      project: prompt.project,
      created_at_epoch: prompt.created_at_epoch,
      field_type: 'prompt',
      type: '',
      title: '',
    };
  }

  /**
   * Embed texts and merge with document metadata to produce full LanceDocuments
   */
  private async embedDocs(docs: Omit<LanceDocument, 'vector'>[]): Promise<LanceDocument[]> {
    if (docs.length === 0) return [];

    const texts = docs.map(d => d.text);
    const vectors = await embeddingService.encodeBatch(texts);

    return docs.map((doc, i) => ({ ...doc, vector: vectors[i] }));
  }

  // ── Public sync methods ─────────────

  async syncObservation(
    observationId: number,
    memorySessionId: string,
    project: string,
    obs: ParsedObservation,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens: number = 0
  ): Promise<void> {
    const stored: StoredObservation = {
      id: observationId,
      memory_session_id: memorySessionId,
      project,
      text: null,
      type: obs.type,
      title: obs.title,
      subtitle: obs.subtitle,
      facts: JSON.stringify(obs.facts),
      narrative: obs.narrative,
      concepts: JSON.stringify(obs.concepts),
      files_read: JSON.stringify(obs.files_read),
      files_modified: JSON.stringify(obs.files_modified),
      prompt_number: promptNumber,
      discovery_tokens: discoveryTokens,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
    };

    const rawDocs = this.formatObservationDocs(stored);
    const docs = await this.embedDocs(rawDocs);

    logger.info('LANCE', 'Syncing observation to LanceDB', {
      observationId,
      documentCount: docs.length,
      project,
    });

    await this.addDocuments(docs);
  }

  async syncSummary(
    summaryId: number,
    memorySessionId: string,
    project: string,
    summary: ParsedSummary,
    promptNumber: number,
    createdAtEpoch: number,
    discoveryTokens: number = 0
  ): Promise<void> {
    const stored: StoredSummary = {
      id: summaryId,
      memory_session_id: memorySessionId,
      project,
      request: summary.request,
      investigated: summary.investigated,
      learned: summary.learned,
      completed: summary.completed,
      next_steps: summary.next_steps,
      notes: summary.notes,
      prompt_number: promptNumber,
      discovery_tokens: discoveryTokens,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
    };

    const rawDocs = this.formatSummaryDocs(stored);
    const docs = await this.embedDocs(rawDocs);

    logger.info('LANCE', 'Syncing summary to LanceDB', {
      summaryId,
      documentCount: docs.length,
      project,
    });

    await this.addDocuments(docs);
  }

  async syncUserPrompt(
    promptId: number,
    memorySessionId: string,
    project: string,
    promptText: string,
    promptNumber: number,
    createdAtEpoch: number
  ): Promise<void> {
    const stored: StoredUserPrompt = {
      id: promptId,
      content_session_id: '',
      prompt_number: promptNumber,
      prompt_text: promptText,
      created_at: new Date(createdAtEpoch * 1000).toISOString(),
      created_at_epoch: createdAtEpoch,
      memory_session_id: memorySessionId,
      project,
    };

    const rawDoc = this.formatUserPromptDoc(stored);
    const docs = await this.embedDocs([rawDoc]);

    logger.info('LANCE', 'Syncing user prompt to LanceDB', { promptId, project });

    await this.addDocuments(docs);
  }

  // ── Query ───────────────────────────────────────────────────────────

  /**
   * Semantic vector search over the LanceDB table.
   * Returns deduplicated IDs with metadata for hydration from SQLite.
   */
  async queryLance(
    query: string,
    limit: number,
    whereFilter?: Record<string, any>
  ): Promise<{ ids: number[]; distances: number[]; metadatas: any[] }> {
    await this.ensureConnection();

    if (!this.table) {
      return { ids: [], distances: [], metadatas: [] };
    }

    try {
      const queryVector = await embeddingService.encode(query);

      // LanceDB vector search
      let searchBuilder = this.table.search(queryVector).limit(limit * 3); // Over-fetch to deduplicate

      // Apply where filter if provided
      if (whereFilter) {
        const clauses: string[] = [];
        for (const [key, value] of Object.entries(whereFilter)) {
          if (typeof value === 'string') {
            clauses.push(`${key} = '${value.replace(/'/g, "''")}'`);
          } else if (typeof value === 'number') {
            clauses.push(`${key} = ${value}`);
          }
        }
        if (clauses.length > 0) {
          searchBuilder = searchBuilder.where(clauses.join(' AND '));
        }
      }

      const results = await searchBuilder.toArray();

      // Deduplicate by sqlite_id, keeping best (lowest distance) per ID
      const seen = new Map<number, { distance: number; metadata: any }>();

      for (const row of results) {
        const sqliteId = row.sqlite_id;
        const distance = row._distance ?? 0;

        if (!seen.has(sqliteId) || distance < seen.get(sqliteId)!.distance) {
          seen.set(sqliteId, {
            distance,
            metadata: {
              sqlite_id: row.sqlite_id,
              doc_type: row.doc_type,
              memory_session_id: row.memory_session_id,
              project: row.project,
              created_at_epoch: row.created_at_epoch,
              field_type: row.field_type,
              type: row.type,
              title: row.title,
            },
          });
        }
      }

      // Sort by distance (ascending) and take requested limit
      const sorted = [...seen.entries()]
        .sort((a, b) => a[1].distance - b[1].distance)
        .slice(0, limit);

      const ids = sorted.map(([id]) => id);
      const distances = sorted.map(([, v]) => v.distance);
      const metadatas = sorted.map(([, v]) => v.metadata);

      return { ids, distances, metadatas };
    } catch (error) {
      logger.error('LANCE', 'LanceDB query failed', { project: this.project, query }, error as Error);
      throw new Error(`LanceDB query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── Backfill ────────────────────────────────────────────────────────

  /**
   * Smart backfill: sync all SQLite records not yet in LanceDB.
   * Reads existing LanceDB IDs, diffs against SQLite, embeds and inserts the delta.
   */
  async ensureBackfilled(): Promise<void> {
    logger.info('LANCE', 'Starting smart backfill', { project: this.project });

    await this.ensureConnection();

    // 1. Collect existing sqlite_ids already in LanceDB
    const existingObs = new Set<number>();
    const existingSummaries = new Set<number>();
    const existingPrompts = new Set<number>();

    if (this.table) {
      try {
        const allRows = await this.table
          .search([])          // empty search = scan
          .select(['sqlite_id', 'doc_type'])
          .limit(1_000_000)
          .toArray();

        for (const row of allRows) {
          if (row.doc_type === 'observation') existingObs.add(row.sqlite_id);
          else if (row.doc_type === 'session_summary') existingSummaries.add(row.sqlite_id);
          else if (row.doc_type === 'user_prompt') existingPrompts.add(row.sqlite_id);
        }
      } catch {
        // Table might be empty or not support empty search -- treat as nothing existing
        logger.debug('LANCE', 'Could not scan existing LanceDB rows, treating as empty', { project: this.project });
      }
    }

    logger.info('LANCE', 'Existing LanceDB IDs', {
      project: this.project,
      observations: existingObs.size,
      summaries: existingSummaries.size,
      prompts: existingPrompts.size,
    });

    // 2. Open SQLite and find missing records
    const db = new SessionStore();

    try {
      // ── Observations ──
      const existingObsIds = Array.from(existingObs);
      const obsExclusion = existingObsIds.length > 0
        ? `AND id NOT IN (${existingObsIds.join(',')})`
        : '';

      const observations = db.db.prepare(`
        SELECT * FROM observations
        WHERE project = ? ${obsExclusion}
        ORDER BY id ASC
      `).all(this.project) as StoredObservation[];

      logger.info('LANCE', 'Backfilling observations', {
        project: this.project,
        missing: observations.length,
        existing: existingObs.size,
      });

      const obsDocs: Omit<LanceDocument, 'vector'>[] = [];
      for (const obs of observations) {
        obsDocs.push(...this.formatObservationDocs(obs));
      }

      for (let i = 0; i < obsDocs.length; i += this.BATCH_SIZE) {
        const batch = obsDocs.slice(i, i + this.BATCH_SIZE);
        const embedded = await this.embedDocs(batch);
        await this.addDocuments(embedded);
      }

      // ── Summaries ──
      const existingSummaryIds = Array.from(existingSummaries);
      const summaryExclusion = existingSummaryIds.length > 0
        ? `AND id NOT IN (${existingSummaryIds.join(',')})`
        : '';

      const summaries = db.db.prepare(`
        SELECT * FROM session_summaries
        WHERE project = ? ${summaryExclusion}
        ORDER BY id ASC
      `).all(this.project) as StoredSummary[];

      logger.info('LANCE', 'Backfilling summaries', {
        project: this.project,
        missing: summaries.length,
        existing: existingSummaries.size,
      });

      const summaryDocs: Omit<LanceDocument, 'vector'>[] = [];
      for (const s of summaries) {
        summaryDocs.push(...this.formatSummaryDocs(s));
      }

      for (let i = 0; i < summaryDocs.length; i += this.BATCH_SIZE) {
        const batch = summaryDocs.slice(i, i + this.BATCH_SIZE);
        const embedded = await this.embedDocs(batch);
        await this.addDocuments(embedded);
      }

      // ── User Prompts ──
      const existingPromptIds = Array.from(existingPrompts);
      const promptExclusion = existingPromptIds.length > 0
        ? `AND up.id NOT IN (${existingPromptIds.join(',')})`
        : '';

      const prompts = db.db.prepare(`
        SELECT
          up.*,
          s.project,
          s.memory_session_id
        FROM user_prompts up
        JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
        WHERE s.project = ? ${promptExclusion}
        ORDER BY up.id ASC
      `).all(this.project) as StoredUserPrompt[];

      logger.info('LANCE', 'Backfilling user prompts', {
        project: this.project,
        missing: prompts.length,
        existing: existingPrompts.size,
      });

      const promptDocs: Omit<LanceDocument, 'vector'>[] = [];
      for (const p of prompts) {
        promptDocs.push(this.formatUserPromptDoc(p));
      }

      for (let i = 0; i < promptDocs.length; i += this.BATCH_SIZE) {
        const batch = promptDocs.slice(i, i + this.BATCH_SIZE);
        const embedded = await this.embedDocs(batch);
        await this.addDocuments(embedded);
      }

      logger.info('LANCE', 'Smart backfill complete', {
        project: this.project,
        synced: {
          observationDocs: obsDocs.length,
          summaryDocs: summaryDocs.length,
          promptDocs: promptDocs.length,
        },
        skipped: {
          observations: existingObs.size,
          summaries: existingSummaries.size,
          prompts: existingPrompts.size,
        },
      });
    } catch (error) {
      logger.error('LANCE', 'Backfill failed', { project: this.project }, error as Error);
      throw new Error(`Backfill failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      db.close();
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  async close(): Promise<void> {
    // LanceDB connections are lightweight; just release references
    this.table = null;
    this.db = null;
    this.connecting = null;
    logger.info('LANCE', 'LanceDB connection released', { project: this.project });
  }
}
