import { createFileRoute } from "@tanstack/react-router";

// /files is the root folder: the section layout shows it; there's no file to open.
export const Route = createFileRoute("/_dashboard/$site/files/")({
	component: () => null,
});
