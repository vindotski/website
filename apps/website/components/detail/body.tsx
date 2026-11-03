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

// A document's body, from Spotcraft's Markdown syntax tree. Its headings
// already carry their ids, the ones the table of contents uses. getContent
// gives each page its own copy, so it can be changed here
export default function Body({ body }: { body: Root | null }) {
  if (!body) return null;
  unwrapImages(body);
  return toJsxRuntime(toHast(body), { Fragment, jsx, jsxs, components });
}
