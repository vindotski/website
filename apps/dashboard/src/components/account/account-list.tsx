import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, KeyRound, LogOut } from "lucide-react";
import { useState } from "react";
import { LIST_ROW } from "#/components/layouts/master-detail";
import { ScreenHeader } from "#/components/layouts/screen-header";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { ROLE_LABELS } from "#/lib/roles";
import { initials } from "#/lib/utils";
import { signOut } from "#/server/auth.functions";
import type { CurrentUser } from "#/server/auth.server";

// Account: who you are, then Password (the section's list; see routes/_dashboard/account.tsx), and
// Sign out right here. The theme is in the avatar menu.

const ITEMS = [
	{
		to: "/account/password",
		label: "Password",
		hint: "Change the password you sign in with",
		icon: KeyRound,
	},
] as const;

export function AccountList({ user }: { user: CurrentUser }) {
	const queryClient = useQueryClient();
	const signOutFn = useServerFn(signOut);
	const [signingOut, setSigningOut] = useState(false);

	async function handleSignOut() {
		setSigningOut(true);
		// Drop cached private data so the next person on this browser never sees it.
		queryClient.clear();
		await signOutFn();
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ScreenHeader title="Account" />
			<div className="flex items-center gap-3 border-b px-4 py-4">
				<Avatar className="size-10 rounded-md">
					<AvatarFallback className="rounded-md font-mono text-xs">
						{initials(user.email)}
					</AvatarFallback>
				</Avatar>
				<div className="grid min-w-0">
					<span className="truncate text-sm font-medium">{user.email}</span>
					<span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
				</div>
			</div>
			<nav aria-label="Account" className="min-h-0 flex-1 overflow-y-auto">
				{ITEMS.map((item) => (
					<Link key={item.to} to={item.to} className={LIST_ROW}>
						<item.icon className="size-4 shrink-0 text-muted-foreground" />
						<span className="grid min-w-0 flex-1">
							<span>{item.label}</span>
							<span className="truncate text-xs text-muted-foreground">{item.hint}</span>
						</span>
						<ChevronRight className="size-4 text-muted-foreground" />
					</Link>
				))}
				<button
					type="button"
					onClick={() => void handleSignOut()}
					disabled={signingOut}
					className={`${LIST_ROW} w-full text-left`}
				>
					<LogOut className="size-4 shrink-0 text-muted-foreground" />
					<span className="flex-1">{signingOut ? "Signing out…" : "Sign out"}</span>
				</button>
			</nav>
		</div>
	);
}
