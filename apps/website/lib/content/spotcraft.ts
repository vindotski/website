import "server-only";
import type { Root } from "mdast";

// Reads the `vindotski` project on Spotcraft's API (api.vin.ski). Reads are
// open, so there's no key. The same shape as @spotcraft/sdk's `content`, so
// it can replace this once it's published. SPOTCRAFT_API_URL is the API, as
// for the content:* scripts

const api = (process.env.SPOTCRAFT_API_URL ?? "https://api.vin.ski").replace(/\/+$/, "");
const project = "vindotski";

// Front matter as JSON; the site's schemas type it (lib/content/schemas.ts)
export type Data = Record<string, unknown>;

// A heading with the id Spotcraft gives it, as GitHub would
export type Heading = { depth: 1 | 2 | 3 | 4 | 5 | 6; text: string; id: string };

// One document in a folder listing. `path` is the file's path without .md
export type ContentItem = { path: string; data: Data; updatedAt: string };

// One document: front matter, its Markdown syntax tree and its headings
export type ContentDocument = {
  path: string;
  data: Data;
  body: Root;
  headings: Heading[];
};

async function read<T>(path: string): Promise<T> {
  const url = `${api}/v1/projects/${project}/content/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Spotcraft answered ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

export const content = {
  // A folder's documents, not its subfolders': list("projects/work")
  async list(folder: string): Promise<ContentItem[]> {
    return (await read<{ items: ContentItem[] }>(`${folder}/`)).items;
  },
  // One document: get("projects/work/huddleos")
  get(path: string): Promise<ContentDocument> {
    return read<ContentDocument>(path);
  },
};
