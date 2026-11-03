import type { Nodes, Root } from "mdast";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { CONTENT_TYPES, type ContentType } from "@/config/content-types";
import { isPublished, showDrafts, todayUtc } from "./publish";
import { content, type ContentDocument, type Heading } from "./spotcraft";
import type { Entry, Item, Post, Project } from "./types";

// Reads the content from Spotcraft (api.vin.ski): cached, sorted, with drafts
// and scheduled items left out of production. Everything is cached with the
// `content` profile (next.config.ts): read again every 5 minutes, so a
// published edit shows without a deploy, and kept for a week, so the site
// keeps serving while api.vin.ski is down

// Validated by the type's schema, so bad data fails loudly, naming the
// document. The keys are the schemas' own; projects take their category from
// their folder (projects/work/…)
function toItem<T extends ContentType>(type: T, doc: ContentDocument): Item<T> {
  const category = type === "projects" ? doc.path.split("/")[1] : undefined;
  const result = CONTENT_TYPES[type].schema.safeParse({
    ...doc.data,
    ...(category && { category }),
  });
  if (!result.success) {
    throw new Error(
      `Invalid fields in Spotcraft document ${doc.path}\n${z.prettifyError(result.error)}`,
    );
  }
  const sections = doc.headings
    .filter((heading) => heading.depth === 2)
    .map((heading) => ({ id: heading.id, title: heading.text }));
  const slug = doc.path.split("/").at(-1)!;
  return { ...result.data, slug, path: doc.path, sections } as Item<T>;
}

// The body's headings get the ids of Spotcraft's `headings`, the ones the
// table of contents uses. Spotcraft lists them in the order this walk finds
// them, so the nth heading here is its nth
function withHeadingIds(body: Root, headings: Heading[]): Root {
  const tree = structuredClone(body);
  let index = 0;
  const visit = (node: Nodes) => {
    if (node.type === "heading") {
      const id = headings[index++]?.id;
      if (id) node.data = { ...node.data, hProperties: { id } };
      return;
    }
    if ("children" in node) for (const child of node.children) visit(child);
  };
  visit(tree);
  return tree;
}

// The type's documents, bodies included: each folder's list, then every
// document in it. Drafts are on main too, without a date
async function loadDocuments(type: ContentType): Promise<ContentDocument[]> {
  "use cache";
  cacheLife("content");
  const lists = await Promise.all(
    CONTENT_TYPES[type].folders.map((folder) => content.list(folder)),
  );
  return Promise.all(lists.flat().map((item) => content.get(item.path)));
}

async function loadAll<T extends ContentType>(type: T): Promise<Item<T>[]> {
  return (await loadDocuments(type)).map((doc) => toItem(type, doc));
}

// Drops drafts and scheduled items, except in `next dev`. Refreshed with the
// content, so a scheduled item goes live within minutes of its date
async function loadPublished<T extends ContentType>(
  type: T,
): Promise<Entry<T>[]> {
  "use cache";
  cacheLife("content");
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
  const doc = (await loadDocuments(type)).find(
    (d) => d.path.split("/").at(-1) === slug,
  );
  return doc ? withHeadingIds(doc.body, doc.headings) : null;
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
