import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "#/lib/utils";
import { useBesideList } from "./master-detail";

/** Every screen's header: an optional back link, the title, and at most one action. */
export function ScreenHeader({
	title,
	back,
	action,
	mono,
}: {
	title: ReactNode;
	/** Where back goes, with a label for screen readers. */
	back?: { to: LinkProps["to"]; params?: LinkProps["params"]; label: string };
	action?: ReactNode;
	/** Paths read better in mono. */
	mono?: boolean;
}) {
	// Beside its list on a wide screen, a detail needs no way back.
	const besideList = useBesideList();
	const backTo = besideList ? undefined : back;
	return (
		<header className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
			{backTo ? (
				<Link
					to={backTo.to}
					params={backTo.params}
					aria-label={backTo.label}
					className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ChevronLeft className="size-5" />
				</Link>
			) : (
				<span className="w-2" />
			)}
			<h1
				className={cn(
					"min-w-0 flex-1 truncate text-base font-semibold",
					mono && "font-mono text-sm",
				)}
			>
				{title}
			</h1>
			{action}
		</header>
	);
}
