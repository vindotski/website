import { createFileRoute } from "@tanstack/react-router";

// /settings/users: the section layout shows the people; nobody is picked yet.
export const Route = createFileRoute("/_dashboard/$site/settings/users/")({
	head: () => ({ meta: [{ title: "Users · Spotcraft" }] }),
	component: () => null,
});
