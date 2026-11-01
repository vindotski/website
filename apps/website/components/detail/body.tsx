import { headingAnchors } from "@spotcraft/client";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import type { Parent, Root } from "mdast";
import { toHast } from "mdast-util-to-hast";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import DetailImage from "@/components/detail/detail-image";

// Markdown images get the same 16:10 frame as the project images
const components: Components = {
  img: ({ src, alt }) => (
    <DetailImage
      image={{ src: String(src), alt: alt ?? "" }}
      sizes="(min-width: 752px) 720px, 100vw"
    />
  ),
};

// An image alone in a paragraph becomes a block of its own, since the frame
// is a <div> and can't sit inside a <p>
function unwrapImages(node: Parent) {
  node.children = node.children.flatMap((child) => {
    if (
      child.type === "paragraph" &&
      child.children.length > 0 &&
      child.children.every(
        (c) => c.type === "image" || (c.type === "text" && !c.value.trim()),
      )
    ) {
      return child.children.filter((c) => c.type === "image");
    }
    if ("children" in child) unwrapImages(child);
    return [child];
  }) as Parent["children"];
}

// A document's body, from Spotcraft's Markdown syntax tree. Headings get the
// ids Spotcraft's search links to, the same ones the table of contents uses
export default function Body({ body }: { body: Root | null }) {
  if (!body) return null;
  const tree = structuredClone(body);
  for (const [heading, id] of headingAnchors(tree)) {
    heading.data = { ...heading.data, hProperties: { id } };
  }
  unwrapImages(tree);
  return toJsxRuntime(toHast(tree), { Fragment, jsx, jsxs, components });
}
