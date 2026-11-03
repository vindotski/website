import type { NextConfig } from "next";

// Spotcraft serves images at <site>/media/…, with a ?v= cache-buster
const cms = new URL(process.env.SPOTCRAFT_URL ?? "http://localhost:3000/vinski");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: cms.protocol.slice(0, -1) as "http" | "https",
        hostname: cms.hostname,
        port: cms.port,
        pathname: `${cms.pathname.replace(/\/$/, "")}/media/**`,
      },
    ],
    // Locally, Spotcraft is on localhost, which the optimizer refuses
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
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
