import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

// Only the teaser homepage until launch. No lastModified: new Date()
// during prerender breaks the build under Cache Components
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl}/` }];
}
