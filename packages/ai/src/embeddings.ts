/**
 * Embeddings for Family Memory recall (pgvector, 1536 dims).
 *
 * The provider is pluggable. The default is a deterministic local
 * feature-hashing embedding: no external calls, no PII leaving the server,
 * and good-enough lexical recall for the record's scale. A hosted
 * embedding provider can be swapped in behind the same interface without
 * touching callers (see packages/ai/README.md).
 */

export const EMBEDDING_DIM = 1536;

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

/** FNV-1a 32-bit hash — stable across runtimes. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  // Unigrams + bigrams give the hashed space some phrase sensitivity.
  const grams = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    grams.push(`${words[i]}_${words[i + 1]}`);
  }
  return grams;
}

export class LocalHashEmbedding implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(EMBEDDING_DIM).fill(0);
    for (const token of tokenize(text)) {
      const h = fnv1a(token);
      const idx = h % EMBEDDING_DIM;
      const sign = (h & 0x80000000) !== 0 ? -1 : 1;
      vec[idx]! += sign;
    }
    const norm = Math.sqrt(vec.reduce((a, v) => a + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}

let provider: EmbeddingProvider = new LocalHashEmbedding();

export function setEmbeddingProvider(p: EmbeddingProvider): void {
  provider = p;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return provider;
}

export async function embedText(text: string): Promise<number[]> {
  return provider.embed(text);
}
