-- Custom migration (drizzle-kit generate --custom): what Drizzle doesn't express.

-- pgvector, for semantic search (search_chunks.embedding). Neon, Supabase, Railway and RDS have
-- it; locally and in CI it comes with the pgvector/pgvector image.
create extension if not exists vector;
