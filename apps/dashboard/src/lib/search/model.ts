// The embedding model search uses, and its vector size (the `search_chunks.embedding` column).
// Changing either needs a migration and `pnpm search:sync`.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
