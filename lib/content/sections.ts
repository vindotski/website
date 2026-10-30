import GithubSlugger from "github-slugger";
import type { Heading, Nodes, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parse as parseYaml } from "yaml";

// Splits an MDX file into its front matter and its ## sections. The table of
// contents and the search index both read sections from here. Kept free of
// Next.js imports so scripts can use it too

export type Section = {
  // The same id rehype-slug gives the heading on the page
  id: string;
  title: string;
  // The section's raw markdown, without its heading; ### subsections included
  text: string;
};

const processor = unified().use(remarkParse).use(remarkFrontmatter);

// Like rehype-slug: one slugger over every heading of any level, in document
// order, so repeated titles get the same "-1" suffixes as on the page
function headingIds(tree: Root) {
  const slugger = new GithubSlugger();
  const ids = new Map<Heading, string>();
  const walk = (node: Nodes) => {
    if (node.type === "heading") {
      // The page's heading text has no image alt, so leave it out here too
      ids.set(node, slugger.slug(toString(node, { includeImageAlt: false })));
    }
    if ("children" in node) node.children.forEach(walk);
  };
  walk(tree);
  return ids;
}

// Front matter is returned unvalidated; the loader checks it against the
// content type's schema. Text before the first ## is in no section
export function parseMdx(raw: string) {
  const tree = processor.parse(raw);
  const ids = headingIds(tree);

  const yaml = tree.children.find((node) => node.type === "yaml");
  const frontmatter: unknown = yaml ? parseYaml(yaml.value) : {};

  // A section runs until the next # or ## heading
  const starts = tree.children.filter(
    (node): node is Heading => node.type === "heading" && node.depth <= 2,
  );
  const sections: Section[] = starts.flatMap((heading, index) => {
    if (heading.depth !== 2) return [];
    const end = starts[index + 1]?.position?.start.offset ?? raw.length;
    return [
      {
        id: ids.get(heading)!,
        title: toString(heading, { includeImageAlt: false }),
        text: raw.slice(heading.position?.end.offset, end).trim(),
      },
    ];
  });

  return { frontmatter, sections };
}
