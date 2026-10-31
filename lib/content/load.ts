import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CONTENT_TYPES, type ContentType } from "../../config/content-types";
import { parseMdx, type Section } from "./sections";

// Reads content/<type>/*.mdx. Kept free of Next.js imports so scripts can use
// it too; lib/content/api.ts adds caching, sorting and the published filter

export type Item<T extends ContentType = ContentType> = z.infer<
  (typeof CONTENT_TYPES)[T]["schema"]
> & {
  // From the file name
  slug: string;
  sections: Section[];
};

const contentDir = path.join(process.cwd(), "content");

// Invalid front matter throws, naming the file, so a typo fails the build
export async function loadItems<T extends ContentType>(
  type: T,
): Promise<Item<T>[]> {
  const dir = path.join(contentDir, type);
  // A type with no folder yet simply has no items
  const files = await readdir(dir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  return Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .map(async (file) => {
        const raw = await readFile(path.join(dir, file), "utf8");
        const { frontmatter, sections } = parseMdx(raw);
        const result = CONTENT_TYPES[type].schema.safeParse(frontmatter);
        if (!result.success) {
          throw new Error(
            `Invalid front matter in content/${type}/${file}\n${z.prettifyError(result.error)}`,
          );
        }
        const slug = file.replace(/\.mdx$/, "");
        return { ...result.data, slug, sections } as Item<T>;
      }),
  );
}
