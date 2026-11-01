import { Files, House, Settings } from "lucide-react";
import type { ComponentType } from "react";
import { activityOf } from "#/lib/files/activity";

// `active` gets the path within the site (`/files/posts`, not `/docs/files/posts`). `exact`: the
// Link counts as current only on its own path (Home, or every page under the site would be it).

export type Place = {
	to: "/$site" | "/$site/files" | "/$site/settings";
	label: string;
	icon: ComponentType<{ className?: string }>;
	active: (pathname: string) => boolean;
	exact?: boolean;
};

/** Home, Files and Settings: the same three places for every role — in the top bar on wide
 * screens, the bottom bar on phones. */
export const PLACES: Place[] = [
	{ to: "/$site", label: "Home", icon: House, active: (p) => p === "/", exact: true },
	{ to: "/$site/files", label: "Files", icon: Files, active: (p) => activityOf(p) === "files" },
	{
		to: "/$site/settings",
		label: "Settings",
		icon: Settings,
		active: (p) => p.startsWith("/settings"),
	},
];
