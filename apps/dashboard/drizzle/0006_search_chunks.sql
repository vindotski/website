CREATE TABLE "search_chunks" (
	"entry_id" uuid NOT NULL,
	"key" text NOT NULL,
	"heading" text,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_chunks_entry_id_key_pk" PRIMARY KEY("entry_id","key")
);
--> statement-breakpoint
ALTER TABLE "search_chunks" ADD CONSTRAINT "search_chunks_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_chunks_embedding_idx" ON "search_chunks" USING hnsw ("embedding" vector_cosine_ops);