import { createFileRoute } from "@tanstack/react-router";

// /settings: the section layout shows the list; nothing is picked yet.
export const Route = createFileRoute("/_dashboard/$site/settings/")({ component: () => null });
