import { work } from "./data";
import type { Work } from "./types";

// Async so callers stay the same when content moves out of local data

function findBySlug<T extends { slug: string }>(items: T[], slug: string) {
  return items.find((item) => item.slug === slug) ?? null;
}

// Wraps around, so the last item's next is the first
function nextAfter<T extends { slug: string }>(items: T[], slug: string) {
  const index = items.findIndex((item) => item.slug === slug);
  if (index === -1 || items.length < 2) return null;
  return items[(index + 1) % items.length];
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
