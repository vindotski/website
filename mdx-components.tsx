import type { MDXComponents } from "mdx/types";
import DetailImage from "@/components/detail/detail-image";

// Required by @next/mdx in the App Router. Markdown images get the same
// 16:10 frame as the project images; rehype-unwrap-images keeps them out of
// a paragraph, since the frame is a block
const components: MDXComponents = {
  img: ({ src, alt }) => (
    <DetailImage
      image={{ src: String(src), alt: alt ?? "" }}
      sizes="(min-width: 752px) 720px, 100vw"
    />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
