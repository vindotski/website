import { Link } from "@tanstack/react-router";
import { ChevronRight, Globe, Users } from "lucide-react";
import { LIST_ROW } from "#/components/layouts/master-detail";
import { ScreenHeader } from "#/components/layouts/screen-header";
import { useSite } from "#/hooks/use-site";

// Settings: Site and Users — the section's list (see routes/_dashboard/settings.tsx). Users
// opens its own list (see users.tsx).

const ITEMS = [
	{
		to: "/$site/settings/site",
		label: "Site",
		hint: "Name, address, API",
		icon: Globe,
	},
	{
		to: "/$site/settings/users",
		label: "Users",
		hint: "Invite, change roles, remove",
		icon: Users,
	},
] as const;

/** The Settings section's list. */
export function SettingsList() {
	const site = useSite();
	return (
		<div className="flex h-full min-h-0 flex-col">
			<ScreenHeader title="Settings" />
			<nav aria-label="Settings" className="min-h-0 flex-1 overflow-y-auto">
				{ITEMS.map((item) => (
					<Link key={item.to} to={item.to} params={{ site }} className={LIST_ROW}>
						<item.icon className="size-4 shrink-0 text-muted-foreground" />
						<span className="grid min-w-0 flex-1">
							<span>{item.label}</span>
							<span className="truncate text-xs text-muted-foreground">{item.hint}</span>
						</span>
						<ChevronRight className="size-4 text-muted-foreground" />
					</Link>
				))}
			</nav>
		</div>
	);
}
