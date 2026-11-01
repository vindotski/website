import type { SpotcraftDocument } from "@spotcraft/client";
import type { Root } from "mdast";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { CONTENT_TYPES, type ContentType } from "@/config/content-types";
import { cms } from "@/lib/cms";
import { isPublished, showDrafts, todayUtc } from "./publish";
import type { Entry, Item, Post, Project } from "./types";

// Reads the content from Spotcraft: cached, sorted, with drafts and scheduled
// items left out of production

// Spotcraft's webhook clears every entry tagged "spotcraft" when content
// changes (app/api/spotcraft), so cache for as long as possible
const tag = "spotcraft";

// Spotcraft's field keys are snake_case; the schemas' are camelCase
const camelCase = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

// Back into the shape the schemas describe, then validated by them, so bad
// data fails loudly, naming the document. Projects take their category from
// their folder (projects/work/…), and play's `status` is Spotcraft's `stage`
function toItem<T extends ContentType>(type: T, doc: SpotcraftDocument): Item<T> {
  const category = type === "projects" ? doc.path.split("/")[1] : undefined;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc.attributes)) {
    if (value === null) continue;
    fields[category === "play" && key === "stage" ? "status" : camelCase(key)] = value;
  }
  const result = CONTENT_TYPES[type].schema.safeParse({
    ...fields,
    title: doc.title,
    // Drafts have no publish date
    date: doc.publishedAt?.slice(0, 10),
    tags: doc.tags,
    ...(category && { category }),
  });
  if (!result.success) {
    throw new Error(
      `Invalid fields in Spotcraft document ${doc.path}\n${z.prettifyError(result.error)}`,
    );
  }
  const sections = doc.headings
    .filter((heading) => heading.depth === 2)
    .map((heading) => ({ id: heading.anchor, title: heading.text }));
  return { ...result.data, slug: doc.slug, sections } as Item<T>;
}

// The type's documents, bodies included. Drafts are fetched for `next dev`
// only (they need the API token)
async function loadDocuments(type: ContentType): Promise<SpotcraftDocument[]> {
  "use cache";
  cacheTag(tag);
  cacheLife("max");
  return cms.list({ folder: type, deep: true, limit: 100, drafts: showDrafts });
}

async function loadAll<T extends ContentType>(type: T): Promise<Item<T>[]> {
  return (await loadDocuments(type)).map((doc) => toItem(type, doc));
}

// Drops drafts and scheduled items, except in `next dev`. Refreshed hourly, so
// a scheduled item goes live within the hour of its date without a redeploy
async function loadPublished<T extends ContentType>(
  type: T,
): Promise<Entry<T>[]> {
  "use cache";
  cacheTag(tag);
  cacheLife("hours");
  const today = todayUtc();
  const items = (await loadAll(type)).map((item) => ({
    ...item,
    published: isPublished(item.date, today),
  }));
  return showDrafts ? items : items.filter((item) => item.published);
}

function findBySlug<T extends { slug: string }>(items: T[], slug: string) {
  return items.find((item) => item.slug === slug) ?? null;
}

// Wraps around, so the last item's next is the first
function nextAfter<T extends { slug: string }>(items: T[], slug: string) {
  const index = items.findIndex((item) => item.slug === slug);
  if (index === -1 || items.length < 2) return null;
  return items[(index + 1) % items.length];
}

export async function getProjects(): Promise<Project[]> {
  return getItems("projects");
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return getItem("projects", slug);
}

export async function getProjectContent(slug: string): Promise<Root | null> {
  return getContent("projects", slug);
}

// Through all projects, work then play, in their order
export async function getNextProject(slug: string): Promise<Project | null> {
  return getNext("projects", slug);
}

// In the type's display order. Undated drafts sort last; ISO dates sort
// correctly as strings
export async function getItems<T extends ContentType>(
  type: T,
): Promise<Entry<T>[]> {
  const items: Entry[] = [...(await loadPublished(type))];
  if (CONTENT_TYPES[type].sortBy === "date") {
    items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  } else {
    const order = (item: Entry) => item.order ?? Number.MAX_SAFE_INTEGER;
    items.sort((a, b) => order(a) - order(b));
  }
  return items as Entry<T>[];
}

// For generateStaticParams. Cache Components needs at least one param, so a
// type with nothing published yet gets a slug that matches no file and 404s
export async function getStaticSlugs(type: ContentType) {
  const items = await getItems(type);
  if (items.length === 0) return [{ slug: "__none__" }];
  return items.map((item) => ({ slug: item.slug }));
}

export async function getItem<T extends ContentType>(
  type: T,
  slug: string,
): Promise<Entry<T> | null> {
  return findBySlug(await loadPublished(type), slug);
}

// Follows the display order
export async function getNext<T extends ContentType>(
  type: T,
  slug: string,
): Promise<Entry<T> | null> {
  return nextAfter(await getItems(type), slug);
}

// The item's body, as a Markdown syntax tree for <Body>; its fields come from
// getItem, which also decides whether it's published
export async function getContent(
  type: ContentType,
  slug: string,
): Promise<Root | null> {
  const doc = (await loadDocuments(type)).find((d) => d.slug === slug);
  return doc?.body ?? null;
}

export async function getPosts(): Promise<Post[]> {
  return getItems("posts");
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return getItem("posts", slug);
}

export async function getPostContent(slug: string): Promise<Root | null> {
  return getContent("posts", slug);
}

// Newest first, so "next" is the next older post
export async function getNextPost(slug: string): Promise<Post | null> {
  return getNext("posts", slug);
}
