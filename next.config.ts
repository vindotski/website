import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { readContentPaths } from "./lib/content/paths";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Every content file's slug and date, for the proxy's 404 check and the
  // admin toolbar. Read when the build or dev server starts. DEPLOY_ENV is
  // Vercel's production / preview, or development anywhere else
  env: {
    CONTENT_PATHS: JSON.stringify(readContentPaths()),
    DEPLOY_ENV: process.env.VERCEL_ENV ?? "development",
  },
  async redirects() {
    // Section paths have no page of their own; send them to the home section.
    // Temporary until the URL structure settles, since browsers cache 308s.
    return [
      { source: "/projects", destination: "/#projects", permanent: false },
      // Old Work, Play and Samples URLs, from before they became Projects
      ...["work", "play", "samples"].flatMap((old) => [
        { source: `/${old}`, destination: "/#projects", permanent: false },
        { source: `/${old}/:slug`, destination: "/projects/:slug", permanent: false },
      ]),
      { source: "/blog", destination: "/#blog", permanent: false },
    ];
  },
};

// Plugins are named as strings so Turbopack can load them
const withMDX = createMDX({
  options: {
    // Front matter becomes an exported `frontmatter` object
    remarkPlugins: ["remark-frontmatter", "remark-mdx-frontmatter"],
    // Headings get ids, so the table of contents can link to them. Images
    // lose their wrapping paragraph, since they render as a framed block
    rehypePlugins: ["rehype-slug", "rehype-unwrap-images"],
  },
});

export default withMDX(nextConfig);
