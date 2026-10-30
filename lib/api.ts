import type { MDXContent } from "mdx/types";
import { cacheLife } from "next/cache";
import { CONTENT_TYPES, type ContentType } from "./content-types";
import { loadItems, type Item } from "./content/load";
import { isPublished, showDrafts, todayUtc } from "./content/publish";
import {
  about,
  contact,
  experience,
  hero,
  services,
  socials,
} from "./data";
import type {
  About,
  Contact,
  Entry,
  Hero,
  Play,
  Post,
  ResolvedService,
  Role,
  Social,
  Work,
} from "./types";

// Async so callers stay the same when content moves out of local data

// MDX content only changes on deploy, so cache for as long as possible (the
// default profile would refresh every 15 minutes)
async function loadAll<T extends ContentType>(type: T): Promise<Item<T>[]> {
  "use cache";
  cacheLife("max");
  return loadItems(type);
}

// Drops drafts and scheduled items, except in `next dev`. Refreshed hourly, so
// a scheduled item goes live within the hour of its date without a redeploy
async function loadPublished<T extends ContentType>(
  type: T,
): Promise<Entry<T>[]> {
  "use cache";
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

export async function getHero(): Promise<Hero> {
  return hero;
}

export async function getExperience(): Promise<Role[]> {
  return experience;
}

export async function getAbout(): Promise<About> {
  return about;
}

export async function getContact(): Promise<Contact> {
  return contact;
}

export async function getSocials(): Promise<Social[]> {
  return socials;
}

// Proof slugs become links; any that no longer match a project are dropped,
// so renaming or removing a project can't leave a broken link
export async function getServices(): Promise<ResolvedService[]> {
  return Promise.all(
    services.map(async (service) => {
      const items = await Promise.all(
        service.proof.map(({ type, slug }) => getItem(type, slug)),
      );
      return {
        ...service,
        proof: service.proof.flatMap(({ type, slug }, index) => {
          const item = items[index];
          const href = `${CONTENT_TYPES[type].route}/${slug}`;
          return item ? [{ name: item.title, href }] : [];
        }),
      };
    }),
  );
}

export async function getWork(): Promise<Work[]> {
  return getItems("work");
}

export async function getWorkBySlug(slug: string): Promise<Work | null> {
  return getItem("work", slug);
}

export async function getWorkContent(slug: string): Promise<MDXContent> {
  return getContent("work", slug);
}

export async function getNextWork(slug: string): Promise<Work | null> {
  return getNext("work", slug);
}

export async function getPlay(): Promise<Play[]> {
  return getItems("play");
}

export async function getPlayBySlug(slug: string): Promise<Play | null> {
  return getItem("play", slug);
}

export async function getPlayContent(slug: string): Promise<MDXContent> {
  return getContent("play", slug);
}

export async function getNextPlay(slug: string): Promise<Play | null> {
  return getNext("play", slug);
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

// The item's body as a component; front matter comes from getItem
export async function getContent(
  type: ContentType,
  slug: string,
): Promise<MDXContent> {
  const { default: Content } = await import(`@/content/${type}/${slug}.mdx`);
  return Content;
}

export async function getPosts(): Promise<Post[]> {
  return getItems("posts");
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return getItem("posts", slug);
}

export async function getPostContent(slug: string): Promise<MDXContent> {
  return getContent("posts", slug);
}

// Newest first, so "next" is the next older post
export async function getNextPost(slug: string): Promise<Post | null> {
  return getNext("posts", slug);
}
