import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Everything read from Spotcraft (lib/content/api.ts). Read again every
    // 5 minutes, so a published edit shows without a deploy. Kept for a week
    // without visits, so a quiet site still answers from its last good copy
    // while it refreshes, even when api.vin.ski is down. An expire under 5
    // minutes would make the pages dynamic instead of prerendered
    content: { stale: 300, revalidate: 300, expire: 7 * 24 * 60 * 60 },
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

export default nextConfig;
