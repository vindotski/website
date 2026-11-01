import { createFileRoute } from "@tanstack/react-router";
import { apiHandlers } from "#/server/api/http.server";

// The default site's public API: /api/site, /api/content, /api/document and /api/search (each site
// also has its own at /<slug>/api/…). See src/server/api/http.server.ts.
export const Route = createFileRoute("/api/$")({ server: { handlers: apiHandlers } });
