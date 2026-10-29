import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // Section paths have no page of their own; send them to the home section.
    // Temporary until the URL structure settles, since browsers cache 308s.
    return [
      { source: "/work", destination: "/#work", permanent: false },
      { source: "/play", destination: "/#work", permanent: false },
      // Old Samples URLs, from before the section was renamed to Play
      { source: "/samples", destination: "/#work", permanent: false },
      { source: "/samples/:slug", destination: "/play/:slug", permanent: false },
      { source: "/blog", destination: "/#blog", permanent: false },
    ];
  },
};

// Plugins are named as strings so Turbopack can load them
const withMDX = createMDX({
  options: {
    // Front matter becomes an exported `frontmatter` object
    remarkPlugins: ["remark-frontmatter", "remark-mdx-frontmatter"],
    // Headings get ids, so the table of contents can link to them
    rehypePlugins: ["rehype-slug"],
  },
});

export default withMDX(nextConfig);
