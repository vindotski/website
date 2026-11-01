import { useParams, useRouteContext } from "@tanstack/react-router";

/** The dashboard's current site (its slug): the one in the URL, else the one the guard opened. */
export function useSite(): string {
	const inUrl = useParams({ strict: false }).site;
	const { site } = useRouteContext({ from: "/_dashboard" });
	return inUrl ?? site.slug;
}
