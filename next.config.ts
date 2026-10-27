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
      { source: "/samples", destination: "/#samples", permanent: false },
      { source: "/blog", destination: "/#blog", permanent: false },
    ];
  },
};

export default nextConfig;
