import { createFileRoute } from "@tanstack/react-router";
import { apiHandlers } from "#/server/api/http.server";

// A site's public API: /<slug>/api/…. See src/server/api/http.server.ts.
export const Route = createFileRoute("/$site/api/$")({ server: { handlers: apiHandlers } });
