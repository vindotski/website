import { queryOptions } from "@tanstack/react-query";
import { CONTENT_KEY } from "#/integrations/tanstack-query/keys";
import { getSiteSettings, siteIdentity } from "#/server/site-settings.functions";
import { mySites } from "#/server/sites.functions";

// Query options for the site's settings (under CONTENT_KEY, so content writes refresh them too).

export const siteSettingsQuery = queryOptions({
	queryKey: [...CONTENT_KEY, "site-settings"],
	queryFn: () => getSiteSettings(),
});

export const siteIdentityQuery = queryOptions({
	queryKey: [...CONTENT_KEY, "site-identity"],
	queryFn: () => siteIdentity(),
});

/** The sites you work on (the switcher). Not under CONTENT_KEY: the same on every site. */
export const mySitesQuery = queryOptions({
	queryKey: ["my-sites"],
	queryFn: () => mySites(),
});
