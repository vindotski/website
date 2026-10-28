import type { MDXContent } from "mdx/types";
import { cacheLife } from "next/cache";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  about,
  contact,
  hero,
  samples,
  services,
  socials,
  work,
} from "./data";
import type {
  About,
  Contact,
  Hero,
  PostMeta,
  ResolvedService,
  Sample,
  Social,
  Work,
} from "./types";

// Async so callers stay the same when content moves out of local data

const postsDir = path.join(process.cwd(), "content/posts");

// Reads each post's front matter. Posts only change on deploy, so cache for as
// long as possible (the default profile would refresh every 15 minutes)
async function loadPosts(): Promise<PostMeta[]> {
  "use cache";
  cacheLife("max");
  const files = (await readdir(postsDir)).filter((file) =>
    file.endsWith(".mdx"),
  );
  return Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "");
      const { frontmatter } = await import(`@/content/posts/${slug}.mdx`);
      return { slug, ...(frontmatter as Omit<PostMeta, "slug">) };
    }),
  );
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
  return services.map((service) => ({
    ...service,
    proof: service.proof.flatMap(({ kind, slug }) => {
      const item = findBySlug<Work | Sample>(
        kind === "work" ? work : samples,
        slug,
      );
      return item ? [{ name: item.name, href: `/${kind}/${slug}` }] : [];
    }),
  }));
}

export async function getWork(): Promise<Work[]> {
  return work;
}

export async function getWorkBySlug(slug: string): Promise<Work | null> {
  return findBySlug(work, slug);
}

export async function getNextWork(slug: string): Promise<Work | null> {
  return nextAfter(work, slug);
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

// Newest first; ISO dates sort correctly as strings
export async function getPosts(): Promise<PostMeta[]> {
  const posts = await loadPosts();
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPostBySlug(slug: string): Promise<PostMeta | null> {
  return findBySlug(await loadPosts(), slug);
}

// The post's body as a component; front matter comes from getPostBySlug
export async function getPostContent(slug: string): Promise<MDXContent> {
  const { default: Content } = await import(`@/content/posts/${slug}.mdx`);
  return Content;
}

// Follows the newest-first order, so "next" is the next older post
export async function getNextPost(slug: string): Promise<PostMeta | null> {
  return nextAfter(await getPosts(), slug);
}
