ALTER TABLE "search_chunks" ALTER COLUMN "model" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "search_chunks" ALTER COLUMN "embedding" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "search_chunks" ADD COLUMN "fts" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(heading, '')), 'A') || setweight(to_tsvector('english', content), 'B')) STORED;--> statement-breakpoint
CREATE INDEX "search_chunks_fts_idx" ON "search_chunks" USING gin ("fts");