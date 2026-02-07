/**
 * EmbeddingService - In-process embedding generation using Transformers.js
 * Provides in-process embedding generation via local ONNX inference.
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 */

import { createHash } from 'crypto';
import { logger } from '../../utils/logger.js';

// Dynamic import type for @xenova/transformers pipeline
type PipelineFunction = (task: string, model: string) => Promise<any>;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
const CACHE_MAX_SIZE = 2000;

export class EmbeddingService {
  private pipeline: any = null;
  private loading: Promise<void> | null = null;
  private cache: Map<string, number[]> = new Map();

  /**
   * Lazy-load the transformer pipeline on first use
   */
  private async ensureModel(): Promise<void> {
    if (this.pipeline) return;

    // Prevent concurrent loading
    if (this.loading) {
      await this.loading;
      return;
    }

    this.loading = (async () => {
      logger.info('LANCE', 'Loading embedding model...', { model: MODEL_NAME });
      try {
        const { pipeline } = await import('@xenova/transformers') as { pipeline: PipelineFunction };
        this.pipeline = await pipeline('feature-extraction', MODEL_NAME);
        logger.info('LANCE', 'Embedding model loaded', { model: MODEL_NAME, dimensions: EMBEDDING_DIM });
      } catch (error) {
        this.loading = null;
        logger.error('LANCE', 'Failed to load embedding model', { model: MODEL_NAME }, error as Error);
        throw error;
      }
    })();

    await this.loading;
  }

  /**
   * Generate a cache key from text using SHA256
   */
  private cacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Evict oldest entries when cache exceeds max size
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= CACHE_MAX_SIZE) return;

    // Map maintains insertion order; delete the first (oldest) entry
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Encode a single text string into a 384-dim embedding vector
   */
  async encode(text: string): Promise<number[]> {
    const key = this.cacheKey(text);
    const cached = this.cache.get(key);
    if (cached) return cached;

    await this.ensureModel();

    const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    const embedding: number[] = Array.from(output.data).slice(0, EMBEDDING_DIM) as number[];

    this.evictIfNeeded();
    this.cache.set(key, embedding);

    return embedding;
  }

  /**
   * Encode multiple texts into embedding vectors
   */
  async encodeBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    await this.ensureModel();

    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.encode(text));
    }

    return results;
  }
}

/** Shared singleton instance */
export const embeddingService = new EmbeddingService();
