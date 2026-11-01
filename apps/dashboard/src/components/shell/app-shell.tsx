import { type ReactNode, useEffect } from "react";
import { ShellProvider, useShell } from "#/components/layouts/editor-context";
import { isApple, matchShortcut } from "#/lib/shell/shortcuts";
import type { CurrentUser } from "#/server/auth.server";
import { MobileNav } from "./mobile-nav";
import { TopBar } from "./top-bar";

// The dashboard: a top bar (site, account) and three places, Home, Files and Settings —
// in the top bar on wide screens, a bottom bar on phones. Each place lays itself out (see
// MasterDetail). Docs: The dashboard.

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
	return (
		<ShellProvider>
			<Layout user={user}>{children}</Layout>
		</ShellProvider>
	);
}

function useShortcuts() {
	const shell = useShell();
	useEffect(() => {
		const apple = isApple();
		const onKey = (event: KeyboardEvent) => {
			const shortcut = matchShortcut(event, apple);
			if (!shortcut) return;
			const actions = shell.actions.current;
			if (shortcut === "mod+b") shell.setExplorerOpen(!shell.explorerOpen);
			else if (shortcut === "mod+shift+i") shell.toggleInspector();
			else if (shortcut === "mod+s") {
				if (!actions) return;
				actions.save();
			} else if (shortcut === "mod+/") {
				if (!actions?.toggleView) return;
				actions.toggleView();
			}
			event.preventDefault();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [shell]);
}

function Layout({ user, children }: { user: CurrentUser; children: ReactNode }) {
	useShortcuts();

	const main = (
		<main className="flex h-full min-w-0 flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
		</main>
	);

	return (
		<div className="flex h-svh flex-col bg-background">
			<TopBar user={user} />
			<div className="flex min-h-0 flex-1">
				<div className="min-w-0 flex-1">{main}</div>
			</div>
			{/* Phones: always there, like the top bar (CSS decides, so it's in the first paint). */}
			<MobileNav className="md:hidden" />
		</div>
	);
}
