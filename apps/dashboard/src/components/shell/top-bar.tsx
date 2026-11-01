import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	ArrowUpRight,
	Check,
	ChevronsUpDown,
	Code,
	LogOut,
	Monitor,
	Moon,
	Plus,
	Settings,
	Sun,
	UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { sourceUrl } from "#/env";
import { useSite } from "#/hooks/use-site";
import { canManageSite, canUseDashboard, isSuperadmin, ROLE_LABELS } from "#/lib/roles";
import { withoutSite } from "#/lib/site/paths";
import { mySitesQuery, siteIdentityQuery } from "#/lib/site/queries";
import { initials } from "#/lib/utils";
import { signOut } from "#/server/auth.functions";
import type { CurrentUser } from "#/server/auth.server";
import { PLACES } from "./places";

/** The bar across the top: your site (a menu), the places on wide screens, and your account. */
export function TopBar({ user }: { user: CurrentUser }) {
	const pathname = useLocation({ select: (l) => withoutSite(l.pathname) });
	const current = useSite();
	const dashboard = canUseDashboard(user.role);
	const { data: site } = useQuery({ ...siteIdentityQuery, enabled: dashboard });
	const name = dashboard ? (site?.siteName ?? "") : "Spotcraft";

	return (
		<header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 md:h-12">
			<SiteMenu name={name} siteUrl={site?.siteUrl ?? null} user={user} />

			{/* Phones: the places are in the bottom bar. Wide screens: next to the site menu. */}
			<div className="flex-1 md:hidden" />
			<nav aria-label="Places" className="hidden flex-1 items-center gap-1 md:flex">
				{PLACES.map((place) => (
					<Link
						key={place.to}
						to={place.to}
						params={{ site: current }}
						activeOptions={{ exact: place.exact }}
						aria-current={place.active(pathname) ? "page" : undefined}
						className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
					>
						<place.icon className="size-4" />
						{place.label}
					</Link>
				))}
			</nav>

			<AccountMenu user={user} />
		</header>
	);
}

/** Where a site switch lands: the same place on the other site (a file falls back to the list). */
function samePlace(pathname: string) {
	if (pathname.startsWith("/files")) return "/$site/files" as const;
	if (pathname.startsWith("/settings/users")) return "/$site/settings/users" as const;
	if (pathname.startsWith("/settings/site")) return "/$site/settings/site" as const;
	if (pathname.startsWith("/settings")) return "/$site/settings" as const;
	return "/$site" as const;
}

/**
 * Your site's mark and name: the site switcher (the sites you work on; a superadmin's "New
 * site"), and links to view the site or open its settings.
 */
function SiteMenu({
	name,
	siteUrl,
	user,
}: {
	name: string;
	siteUrl: string | null;
	user: CurrentUser;
}) {
	const site = useSite();
	const pathname = useLocation({ select: (l) => withoutSite(l.pathname) });
	const { data: sites = [] } = useQuery(mySitesQuery);
	const to = samePlace(pathname);
	const superadmin = isSuperadmin(user.role);
	// A list to switch in only when there's somewhere to go (or a site to create).
	const switcher = sites.length > 1 || superadmin;
	const dashboard = canUseDashboard(user.role);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`${name || "Spotcraft"}: ${switcher ? "switch site" : "site menu"}`}
					className="flex min-w-0 items-center gap-2 rounded-md py-1 pr-1 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground font-mono text-xs font-bold text-background md:size-7">
						{(Array.from(name || "S")[0] ?? "S").toUpperCase()}/
					</span>
					<span className="max-w-[40vw] truncate text-sm font-semibold md:max-w-48">{name}</span>
					{switcher && (
						<ChevronsUpDown className="hidden size-3.5 shrink-0 text-muted-foreground md:block" />
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-56 max-w-[min(20rem,calc(100vw-1rem))]">
				{switcher && sites.length > 0 && (
					<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
						Sites
					</DropdownMenuLabel>
				)}
				{switcher &&
					sites.map((s) =>
						s.slug === site ? (
							// Already here: choosing it keeps you where you are (an open file stays open).
							<DropdownMenuItem key={s.slug} aria-current="page">
								<Check />
								<span className="min-w-0 flex-1 truncate">{s.name}</span>
								<span className="font-mono text-xs text-muted-foreground">/{s.slug}</span>
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem key={s.slug} asChild>
								{/* No preload: another site's loaders would run as the current one. */}
								<Link to={to} params={{ site: s.slug }} preload={false}>
									<Check className="invisible" />
									<span className="min-w-0 flex-1 truncate">{s.name}</span>
									<span className="font-mono text-xs text-muted-foreground">/{s.slug}</span>
								</Link>
							</DropdownMenuItem>
						),
					)}
				{superadmin && (
					<DropdownMenuItem asChild>
						<Link to="/new-site">
							<Plus /> New site
						</Link>
					</DropdownMenuItem>
				)}
				{switcher && dashboard && <DropdownMenuSeparator />}
				{!dashboard ? null : siteUrl ? (
					<DropdownMenuItem asChild>
						<a href={siteUrl} target="_blank" rel="noreferrer">
							<ArrowUpRight /> View site
						</a>
					</DropdownMenuItem>
				) : (
					// No address yet: it's set in Site settings.
					<DropdownMenuItem disabled>
						<ArrowUpRight /> View site
					</DropdownMenuItem>
				)}
				{canManageSite(user.role) && (
					<DropdownMenuItem asChild>
						<Link to="/$site/settings/site" params={{ site }}>
							<Settings /> Site settings
						</Link>
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function AccountMenu({ user }: { user: CurrentUser }) {
	const queryClient = useQueryClient();
	const signOutFn = useServerFn(signOut);
	const { setTheme } = useTheme();

	async function handleSignOut() {
		// Drop cached private data so the next person on this browser never sees it.
		queryClient.clear();
		await signOutFn();
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex size-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-auto"
					aria-label={`Account: ${user.email ?? ""}`}
				>
					<Avatar className="size-8 rounded-md">
						<AvatarFallback className="rounded-md font-mono text-xs">
							{initials(user.email)}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				<DropdownMenuLabel className="grid font-normal">
					<span className="truncate">{user.email}</span>
					<span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/account">
						<UserRound /> Account
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => setTheme("light")}>
					<Sun /> Light
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => setTheme("dark")}>
					<Moon /> Dark
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => setTheme("system")}>
					<Monitor /> System
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<a href={sourceUrl} target="_blank" rel="noreferrer">
						<Code /> Source code
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={handleSignOut}>
					<LogOut /> Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
