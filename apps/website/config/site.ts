// The one address search engines should know; vin.ski redirects here
export const siteUrl = "https://www.vin.ski";

// Only the live site gets indexed. Vercel previews and local builds stay out
// of search results
export const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";
