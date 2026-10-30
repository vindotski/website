import type { MDXContent } from "mdx/types";
import { cacheLife } from "next/cache";
import { CONTENT_TYPES, type ContentType } from "./content-types";
import { loadItems, type Item } from "./content/load";
import {
  about,
  contact,
  experience,
  hero,
  samples,
  services,
  socials,
} from "./data";
import type {
  About,
  Contact,
  Hero,
  Post,
  ResolvedService,
  Role,
  Sample,
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
  const work = await getWork();
  return services.map((service) => ({
    ...service,
    proof: service.proof.flatMap(({ kind, slug }) => {
      if (kind === "work") {
        const item = findBySlug(work, slug);
        return item ? [{ name: item.title, href: `/work/${slug}` }] : [];
      }
      const item = findBySlug(samples, slug);
      return item ? [{ name: item.name, href: `/play/${slug}` }] : [];
    }),
  }));
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

export async function getSamples(): Promise<Sample[]> {
  return samples;
}

export async function getSampleBySlug(slug: string): Promise<Sample | null> {
  return findBySlug(samples, slug);
}

export async function getNextSample(slug: string): Promise<Sample | null> {
  return nextAfter(samples, slug);
}

// In the type's display order. Undated drafts sort last; ISO dates sort
// correctly as strings
export async function getItems<T extends ContentType>(
  type: T,
): Promise<Item<T>[]> {
  const items: Item[] = [...(await loadAll(type))];
  if (CONTENT_TYPES[type].sortBy === "date") {
    items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  } else {
    const order = (item: Item) => item.order ?? Number.MAX_SAFE_INTEGER;
    items.sort((a, b) => order(a) - order(b));
  }
  return items as Item<T>[];
}

export async function getItem<T extends ContentType>(
  type: T,
  slug: string,
): Promise<Item<T> | null> {
  return findBySlug(await loadAll(type), slug);
}

// Follows the display order
export async function getNext<T extends ContentType>(
  type: T,
  slug: string,
): Promise<Item<T> | null> {
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
