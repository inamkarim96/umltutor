"use strict";

const { LRUCache } = require('lru-cache');
const crypto = require('crypto');

let embedder = null;
let modelLoading = null;
let modelLoadError = null;

const EMBEDDING_DIM = 384;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

const embeddingCache = new LRUCache({
  max: 5000,
  ttl: 1000 * 60 * 60,
  updateAgeOnGet: true,
});

async function loadModel() {
  if (embedder) return embedder;
  if (modelLoading) return modelLoading;
  if (modelLoadError) throw modelLoadError;

  modelLoading = (async () => {
    try {
      const { pipeline } = require('@xenova/transformers');
      embedder = await pipeline('feature-extraction', MODEL_NAME, {
        quantized: true,
      });
      console.log('[EmbeddingService] Model loaded successfully');
      return embedder;
    } catch (err) {
      modelLoadError = err;
      console.error('[EmbeddingService] Failed to load model:', err.message);
      throw err;
    } finally {
      modelLoading = null;
    }
  })();

  return modelLoading;
}

function normalizeForCache(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 512);
}

function cacheKey(text) {
  const normalized = normalizeForCache(text);
  return 'emb:' + crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

async function getEmbedding(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return new Float32Array(EMBEDDING_DIM);
  }

  const key = cacheKey(text);
  const cached = embeddingCache.get(key);
  if (cached) {
    return new Float32Array(cached);
  }

  try {
    await loadModel();
    const result = await embedder(text, { pooling: 'mean', normalize: true });
    const embedding = new Float32Array(result.data);
    
    embeddingCache.set(key, Array.from(embedding));
    return embedding;
  } catch (err) {
    console.warn('[EmbeddingService] Embedding failed, returning zero vector:', err.message);
    return new Float32Array(EMBEDDING_DIM);
  }
}

async function getEmbeddings(texts) {
  const validTexts = texts.filter(t => t && typeof t === 'string' && t.trim());
  if (validTexts.length === 0) {
    return texts.map(() => new Float32Array(EMBEDDING_DIM));
  }

  const results = new Array(texts.length);
  const uncached = [];
  const uncachedIndices = [];

  texts.forEach((text, idx) => {
    if (!text || typeof text !== 'string' || !text.trim()) {
      results[idx] = new Float32Array(EMBEDDING_DIM);
      return;
    }
    const key = cacheKey(text);
    const cached = embeddingCache.get(key);
    if (cached) {
      results[idx] = new Float32Array(cached);
    } else {
      uncached.push(text);
      uncachedIndices.push(idx);
    }
  });

  if (uncached.length > 0) {
    try {
      await loadModel();
      const batchResults = await embedder(uncached, { pooling: 'mean', normalize: true });
      
      for (let i = 0; i < uncached.length; i++) {
        const embedding = new Float32Array(batchResults.data.slice(i * EMBEDDING_DIM, (i + 1) * EMBEDDING_DIM));
        const idx = uncachedIndices[i];
        results[idx] = embedding;
        embeddingCache.set(cacheKey(uncached[i]), Array.from(embedding));
      }
    } catch (err) {
      console.warn('[EmbeddingService] Batch embedding failed:', err.message);
      uncachedIndices.forEach(idx => {
        results[idx] = new Float32Array(EMBEDDING_DIM);
      });
    }
  }

  return results;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function semanticSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  try {
    const [embA, embB] = await Promise.all([getEmbedding(a), getEmbedding(b)]);
    return cosineSimilarity(embA, embB);
  } catch (err) {
    return 0;
  }
}

function clearCache() {
  embeddingCache.clear();
}

function getCacheStats() {
  return {
    size: embeddingCache.size,
    max: embeddingCache.max,
    calculatedSize: embeddingCache.calculatedSize,
  };
}

function isModelLoaded() {
  return !!embedder;
}

function getModelLoadError() {
  return modelLoadError;
}

module.exports = {
  getEmbedding,
  getEmbeddings,
  cosineSimilarity,
  semanticSimilarity,
  clearCache,
  getCacheStats,
  isModelLoaded,
  getModelLoadError,
  EMBEDDING_DIM,
  MODEL_NAME,
};