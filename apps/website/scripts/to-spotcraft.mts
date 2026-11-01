// One-off: converts content/<type>/*.mdx into a Spotcraft export directory,
// for `pnpm cms:import`. Front matter is checked against the content schemas
// first, so bad data fails here and not in Spotcraft.
//
//   pnpm --filter website exec tsx scripts/to-spotcraft.mts [out-dir]
//
// out-dir defaults to spotcraft-content/ at the repository root, and is
// replaced on every run

import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import { CONTENT_TYPES, type ContentType } from "../config/content-types";

const contentDir = path.join(process.cwd(), "content");
const publicDir = path.join(process.cwd(), "public");
const outDir = path.resolve(process.argv[2] ?? "../../spotcraft-content");

const site = { name: "Ivan Vinski", site_url: "https://www.vin.ski" };

// Field configs per folder. A document's fields are every config on its path
const configs: Record<string, object> = {
  posts: {
    fields: [
      { key: "tldr", label: "TL;DR", type: "text", multiline: true, required: true },
      { key: "repo_url", label: "Repository", type: "url" },
      { key: "demo_url", label: "Demo", type: "url" },
    ],
  },
  projects: {
    fields: [
      { key: "tldr", label: "TL;DR", type: "text", multiline: true, required: true },
      { key: "summary", label: "Summary", type: "text", multiline: true, required: true },
      { key: "order", label: "Order", type: "number" },
      {
        key: "kind",
        label: "Kind",
        type: "select",
        options: ["Frontend", "Fullstack", "Product"],
        required: true,
      },
      { key: "stack", label: "Stack", type: "list", of: { type: "text" }, required: true },
      { key: "image", label: "Cover", type: "image", required: true },
      { key: "repo_url", label: "Repository", type: "url" },
    ],
  },
  "projects/work": {
    fields: [
      { key: "company", label: "Company", type: "text", required: true },
      { key: "role", label: "Role", type: "text", required: true },
      {
        key: "years",
        label: "Years",
        type: "object",
        required: true,
        fields: [
          { key: "start", label: "Start", type: "number", required: true },
          { key: "end", label: "End", type: "number" },
        ],
      },
      { key: "impact", label: "Impact", type: "text", multiline: true, required: true },
      { key: "product_url", label: "Product", type: "url" },
      { key: "demo_url", label: "Demo", type: "url" },
    ],
  },
  "projects/play": {
    fields: [
      { key: "year", label: "Year", type: "number", required: true },
      {
        key: "stage",
        label: "Status",
        type: "select",
        options: ["Live", "In progress", "Archived"],
        required: true,
      },
      { key: "demo_url", label: "Demo", type: "url", required: true },
    ],
  },
};

const frontMatter = /^---\n([\s\S]*?)\n---\n/;
const bodyImage = /!\[([^\]]*)\]\(\/images\/([^)\s]+)\)/g;

// The import needs an id on every document (Spotcraft's tree reader gives new
// files none). A UUID v5-style hash of the path, so a re-run keeps the same
// ids and updates documents instead of clashing with them
function idOf(folder: string) {
  const hex = createHash("sha1").update(`vinski:${folder}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const snakeCase =(key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
// Spotcraft tags are kebab-case: "node.js" becomes "nodejs"
const tagOf = (tag: string) => tag.toLowerCase().replace(/[^a-z0-9-]/g, "");

async function convert(type: ContentType, file: string) {
  const raw = await readFile(path.join(contentDir, type, file), "utf8");
  const match = raw.match(frontMatter);
  if (!match) throw new Error(`No front matter in content/${type}/${file}`);
  const parsed = CONTENT_TYPES[type].schema.safeParse(parseYaml(match[1]));
  if (!parsed.success) {
    throw new Error(
      `Invalid front matter in content/${type}/${file}\n${z.prettifyError(parsed.error)}`,
    );
  }

  const slug = file.replace(/\.mdx$/, "");
  const { title, date, tags, ...fields }: Record<string, unknown> & {
    title: string;
    date?: string;
    tags: string[];
  } = parsed.data;
  const category = "category" in fields ? String(fields.category) : null;
  delete fields.category;
  const folder = category ? `${type}/${category}/${slug}` : `${type}/${slug}`;
  const dir = path.join(outDir, folder);
  await mkdir(dir, { recursive: true });

  // Images move next to the document and are named by their file name
  const copyImage = async (src: string) => {
    const name = path.basename(src);
    await copyFile(path.join(publicDir, src), path.join(dir, name));
    return name;
  };

  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    // `status` is built in, so play's status is `stage`
    const name = category === "play" && key === "status" ? "stage" : snakeCase(key);
    attributes[name] = value;
  }
  if (attributes.image) {
    const image = attributes.image as { src: string; alt: string };
    attributes.image = { src: await copyImage(image.src), alt: image.alt };
  }

  let body = raw.slice(match[0].length).replace(/^\n+/, "");
  for (const [, , src] of body.matchAll(bodyImage)) await copyImage(`/images/${src}`);
  body = body.replace(bodyImage, (_, alt, src) => `![${alt}](${path.basename(src)})`);

  const document = {
    id: idOf(folder),
    title,
    // No date is a draft, and a draft has no publish date
    status: date ? "published" : "draft",
    ...(date && { published_at: `${date}T00:00:00.000Z` }),
    tags: tags.map(tagOf),
    ...attributes,
  };
  await writeFile(path.join(dir, "index.md"), `---\n${stringifyYaml(document)}---\n${body}`);
  return folder;
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "spotcraft.yaml"), "format: 2\n");
await writeFile(path.join(outDir, "site.yaml"), stringifyYaml(site));
for (const [folder, config] of Object.entries(configs)) {
  await mkdir(path.join(outDir, folder), { recursive: true });
  await writeFile(
    path.join(outDir, folder, "_config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );
}

for (const type of Object.keys(CONTENT_TYPES) as ContentType[]) {
  const files = (await readdir(path.join(contentDir, type))).filter((f) => f.endsWith(".mdx"));
  for (const file of files) console.log(`${type}/${file} → ${await convert(type, file)}`);
}
console.log(`Wrote ${outDir}`);
