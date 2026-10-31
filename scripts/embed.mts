// Syncs the search index in Supabase with the MDX in content/. The repo is the
// source of truth: this embeds chunks that are new or changed, and deletes
// rows for chunks, items and types that are gone. Safe to run any time.
//
//   pnpm embed            sync
//   pnpm embed --dry-run  show what would change, write nothing
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (from .env.local
// locally, from CI secrets in CI)

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CONTENT_TYPES, type ContentType } from "../config/content-types";
import { loadItems, type Item } from "../lib/content/load";
import type { Database } from "../lib/supabase/database.types";

type Row = Database["public"]["Tables"]["documents"]["Insert"];
type Chunk = Omit<Row, "embedding" | "content_hash" | "created_at" | "updated_at">;

// Part of every hash, so changing the model re-embeds everything
const model = "gte-small";
// gte-small reads ~512 tokens and drops the rest. Leaves room for the
// "title — heading" prefix and for code, which costs more tokens per word
const maxWords = 300;
const maxChars = 3000;
// Hosted Edge Functions get 2 s of CPU per request, and 16 texts in one call
// ran out (546). One text per call stays well inside it
const embedRetries = 3;
// Rows per upsert or delete request
const writeBatch = 10;

const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
}
const db = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Markdown that carries no meaning for search: images keep their alt text,
// MDX comments go
function clean(markdown: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const fits = (text: string) =>
  wordCount(text) <= maxWords && text.length <= maxChars;

// Groups paragraphs into parts that fit. A single paragraph too long on its
// own is cut by words
function split(text: string) {
  const parts: string[] = [];
  let current = "";
  for (const paragraph of text.split(/\n{2,}/)) {
    const joined = current ? `${current}\n\n${paragraph}` : paragraph;
    if (fits(joined)) {
      current = joined;
      continue;
    }
    if (current) parts.push(current);
    current = paragraph;
    while (!fits(current)) {
      const words = current.split(/(\s+)/);
      let cut = "";
      for (const word of words) {
        if (!fits(cut + word)) break;
        cut += word;
      }
      parts.push(cut.trim());
      current = current.slice(cut.length).trim();
    }
  }
  if (current) parts.push(current);
  return parts;
}

// One summary chunk per item, then one per ## section, or several when a
// section is long. Each part repeats "title — heading" so it stands alone
function chunk(type: ContentType, item: Item): Chunk[] {
  const base = {
    type,
    slug: item.slug,
    title: item.title,
    tags: item.tags,
    published_at: item.date ?? null,
  };
  const tags = item.tags.length > 0 ? `\n\nTags: ${item.tags.join(", ")}` : "";
  const chunks: Chunk[] = [
    {
      ...base,
      id: `${type}/${item.slug}#tldr`,
      heading: null,
      content: `${item.title}\n\n${item.tldr}${tags}`,
    },
  ];
  for (const section of item.sections) {
    const text = clean(section.text);
    if (!text) continue;
    split(text).forEach((part, index) => {
      const suffix = index === 0 ? "" : `:${index + 1}`;
      chunks.push({
        ...base,
        id: `${type}/${item.slug}#${section.id}${suffix}`,
        heading: section.title,
        content: `${item.title} — ${section.title}\n\n${part}`,
      });
    });
  }
  return chunks;
}

function hash(chunk: Chunk) {
  const fields = [
    model,
    chunk.id,
    chunk.type,
    chunk.slug,
    chunk.title,
    chunk.heading,
    chunk.tags,
    chunk.published_at,
    chunk.content,
  ];
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

// Out of resources (546) or not reachable yet (502, 503, 504): a fresh
// worker may manage
const retryable = new Set([502, 503, 504, 546]);

async function embed(text: string): Promise<number[]> {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await db.functions.invoke<{
      embeddings: number[][];
    }>("embed", { body: { input: [text] } });
    if (data) return data.embeddings[0];

    // supabase-js only says "non-2xx"; the status and body say why
    const response: unknown = error?.context;
    const status = response instanceof Response ? response.status : 0;
    if (retryable.has(status) && attempt < embedRetries) {
      const wait = 2000 * 2 ** attempt;
      console.log(`  embed answered ${status}, retrying in ${wait / 1000} s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
      continue;
    }
    const detail =
      response instanceof Response
        ? `${status} ${await response.text().catch(() => "")}`
        : (error?.message ?? "empty response");
    throw new Error(`embed failed: ${detail}`);
  }
}

// Paged, since the API returns at most 1000 rows per request
async function existingHashes() {
  const hashes = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("documents")
      .select("id, content_hash")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(`reading documents failed: ${error.message}`);
    data.forEach((row) => hashes.set(row.id, row.content_hash));
    if (data.length < 1000) return hashes;
  }
}

function batches<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

// Drafts (no date) stay out; scheduled items go in, and match_documents
// hides them until their date
const types = Object.keys(CONTENT_TYPES) as ContentType[];
const chunks = (
  await Promise.all(
    types.map(async (type) =>
      (await loadItems(type))
        .filter((item) => item.date !== undefined)
        .flatMap((item) => chunk(type, item)),
    ),
  )
).flat();

// An empty repo would wipe the whole index; far more likely a broken path
if (chunks.length === 0) {
  throw new Error("No published or scheduled content found; nothing synced");
}

const existing = await existingHashes();
const wanted = new Set(chunks.map((chunk) => chunk.id));
const changed = chunks
  .map((chunk) => ({ ...chunk, content_hash: hash(chunk) }))
  .filter((chunk) => existing.get(chunk.id) !== chunk.content_hash);
const stale = [...existing.keys()].filter((id) => !wanted.has(id));

console.log(
  `${chunks.length} chunks: ${changed.length} new or changed, ` +
    `${chunks.length - changed.length} unchanged, ${stale.length} stale`,
);
if (dryRun) {
  changed.forEach((chunk) => console.log(`  embed   ${chunk.id}`));
  stale.forEach((id) => console.log(`  delete  ${id}`));
  process.exit(0);
}

// Upserts first, so a failure part-way never leaves the index emptier. Each
// batch is saved as it's done, so a rerun picks up where a failure stopped
for (const batch of batches(changed, writeBatch)) {
  const rows: Row[] = [];
  for (const chunk of batch) {
    rows.push({ ...chunk, embedding: JSON.stringify(await embed(chunk.content)) });
  }
  const { error } = await db.from("documents").upsert(rows);
  if (error) throw new Error(`upsert failed: ${error.message}`);
  console.log(`  embedded ${batch.map((chunk) => chunk.id).join(", ")}`);
}

for (const batch of batches(stale, writeBatch)) {
  const { error } = await db.from("documents").delete().in("id", batch);
  if (error) throw new Error(`delete failed: ${error.message}`);
  console.log(`  deleted ${batch.join(", ")}`);
}

console.log("Search index is in sync");
