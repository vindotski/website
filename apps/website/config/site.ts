// The one address search engines should know; vin.ski redirects here
export const siteUrl = "https://www.vin.ski";

// Only the live site gets indexed. Vercel previews and local builds stay out
// of search results
export const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

// For the admin toolbar
export const repoUrl = "https://github.com/vindotski/portfolio";
export const vercelProjectUrl = "https://vercel.com/vindotski/portfolio";

// The hosted project's dashboard, from its <ref>.supabase.co URL; locally,
// Supabase Studio
export function supabaseDashboardUrl() {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1").hostname;
  const ref = host.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  return ref
    ? `https://supabase.com/dashboard/project/${ref}`
    : "http://127.0.0.1:54323";
}
