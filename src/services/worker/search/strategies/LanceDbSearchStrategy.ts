/**
 * LanceDbSearchStrategy - Vector-based semantic search via LanceDB
 *
 * Vector-based semantic search via native LanceDB:
 * 1. Query LanceDB for semantically similar documents
 * 2. Filter by recency (90-day window)
 * 3. Categorize by document type
 * 4. Hydrate from SQLite
 *
 * Used when: Query text is provided and LanceSync is available
 */

import { BaseSearchStrategy, SearchStrategy } from './SearchStrategy.js';
import {
  StrategySearchOptions,
  StrategySearchResult,
  SEARCH_CONSTANTS,
  LanceMetadata,
  ObservationSearchResult,
  SessionSummarySearchResult,
  UserPromptSearchResult
} from '../types.js';
import { LanceSync } from '../../../sync/LanceSync.js';
import { SessionStore } from '../../../sqlite/SessionStore.js';
import { logger } from '../../../../utils/logger.js';

export class LanceDbSearchStrategy extends BaseSearchStrategy implements SearchStrategy {
  readonly name = 'lancedb';

  constructor(
    private lanceSync: LanceSync,
    private sessionStore: SessionStore
  ) {
    super();
  }

  canHandle(options: StrategySearchOptions): boolean {
    return !!options.query && !!this.lanceSync;
  }

  async search(options: StrategySearchOptions): Promise<StrategySearchResult> {
    const {
      query,
      searchType = 'all',
      obsType,
      concepts,
      files,
      limit = SEARCH_CONSTANTS.DEFAULT_LIMIT,
      project,
      orderBy = 'date_desc'
    } = options;

    if (!query) {
      return this.emptyResult('lance');
    }

    const searchObservations = searchType === 'all' || searchType === 'observations';
    const searchSessions = searchType === 'all' || searchType === 'sessions';
    const searchPrompts = searchType === 'all' || searchType === 'prompts';

    let observations: ObservationSearchResult[] = [];
    let sessions: SessionSummarySearchResult[] = [];
    let prompts: UserPromptSearchResult[] = [];

    try {
      const whereFilter = this.buildWhereFilter(searchType);

      logger.debug('SEARCH', 'LanceDbSearchStrategy: Querying LanceDB', { query, searchType });
      const lanceResults = await this.lanceSync.queryLance(
        query,
        SEARCH_CONSTANTS.LANCE_BATCH_SIZE,
        whereFilter
      );

      logger.debug('SEARCH', 'LanceDbSearchStrategy: LanceDB returned matches', {
        matchCount: lanceResults.ids.length
      });

      if (lanceResults.ids.length === 0) {
        return {
          results: { observations: [], sessions: [], prompts: [] },
          usedLance: true,
          fellBack: false,
          strategy: 'lance'
        };
      }

      // Step 2: Filter by recency (90 days)
      const recentItems = this.filterByRecency(lanceResults);
      logger.debug('SEARCH', 'LanceDbSearchStrategy: Filtered by recency', {
        count: recentItems.length
      });

      // Step 3: Categorize by document type
      const categorized = this.categorizeByDocType(recentItems, {
        searchObservations,
        searchSessions,
        searchPrompts
      });

      // Step 4: Hydrate from SQLite with additional filters
      if (categorized.obsIds.length > 0) {
        const obsOptions = { type: obsType, concepts, files, orderBy, limit, project };
        observations = this.sessionStore.getObservationsByIds(categorized.obsIds, obsOptions);
      }

      if (categorized.sessionIds.length > 0) {
        sessions = this.sessionStore.getSessionSummariesByIds(categorized.sessionIds, {
          orderBy,
          limit,
          project
        });
      }

      if (categorized.promptIds.length > 0) {
        prompts = this.sessionStore.getUserPromptsByIds(categorized.promptIds, {
          orderBy,
          limit,
          project
        });
      }

      logger.debug('SEARCH', 'LanceDbSearchStrategy: Hydrated results', {
        observations: observations.length,
        sessions: sessions.length,
        prompts: prompts.length
      });

      return {
        results: { observations, sessions, prompts },
        usedLance: true,
        fellBack: false,
        strategy: 'lance'
      };

    } catch (error) {
      logger.error('SEARCH', 'LanceDbSearchStrategy: Search failed', {}, error as Error);
      return {
        results: { observations: [], sessions: [], prompts: [] },
        usedLance: false,
        fellBack: false,
        strategy: 'lance'
      };
    }
  }

  /**
   * Build where filter for document type
   */
  private buildWhereFilter(searchType: string): Record<string, any> | undefined {
    switch (searchType) {
      case 'observations':
        return { doc_type: 'observation' };
      case 'sessions':
        return { doc_type: 'session_summary' };
      case 'prompts':
        return { doc_type: 'user_prompt' };
      default:
        return undefined;
    }
  }

  /**
   * Filter results by recency (90-day window)
   *
   * queryLance() returns deduplicated `ids` (unique sqlite_ids) but the
   * `metadatas` array may contain multiple entries per sqlite_id (e.g., one
   * observation can have narrative + multiple facts as separate documents).
   *
   * This method iterates over the deduplicated `ids` and finds the first
   * matching metadata for each ID to avoid array misalignment issues.
   */
  private filterByRecency(lanceResults: {
    ids: number[];
    metadatas: LanceMetadata[];
  }): Array<{ id: number; meta: LanceMetadata }> {
    const cutoff = Date.now() - SEARCH_CONSTANTS.RECENCY_WINDOW_MS;

    const metadataByIdMap = new Map<number, LanceMetadata>();
    for (const meta of lanceResults.metadatas) {
      if (meta?.sqlite_id !== undefined && !metadataByIdMap.has(meta.sqlite_id)) {
        metadataByIdMap.set(meta.sqlite_id, meta);
      }
    }

    return lanceResults.ids
      .map(id => ({
        id,
        meta: metadataByIdMap.get(id) as LanceMetadata
      }))
      .filter(item => item.meta && item.meta.created_at_epoch > cutoff);
  }

  /**
   * Categorize IDs by document type
   */
  private categorizeByDocType(
    items: Array<{ id: number; meta: LanceMetadata }>,
    options: {
      searchObservations: boolean;
      searchSessions: boolean;
      searchPrompts: boolean;
    }
  ): { obsIds: number[]; sessionIds: number[]; promptIds: number[] } {
    const obsIds: number[] = [];
    const sessionIds: number[] = [];
    const promptIds: number[] = [];

    for (const item of items) {
      const docType = item.meta?.doc_type;
      if (docType === 'observation' && options.searchObservations) {
        obsIds.push(item.id);
      } else if (docType === 'session_summary' && options.searchSessions) {
        sessionIds.push(item.id);
      } else if (docType === 'user_prompt' && options.searchPrompts) {
        promptIds.push(item.id);
      }
    }

    return { obsIds, sessionIds, promptIds };
  }
}
