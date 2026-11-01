import { Link, useLocation } from "@tanstack/react-router";
import { useSite } from "#/hooks/use-site";
import { withoutSite } from "#/lib/site/paths";
import { cn } from "#/lib/utils";
import { PLACES } from "./places";

// h-14 like the top bar on phones; the safe area is added below it, not inside.
const item =
	"flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground";

/** Phone: the bottom bar with the same places as the top bar's. Your account is in the top bar. */
export function MobileNav({ className }: { className?: string }) {
	const pathname = useLocation({ select: (l) => withoutSite(l.pathname) });
	const site = useSite();
	return (
		<nav
			aria-label="Places"
			className={cn(
				"flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]",
				className,
			)}
		>
			{PLACES.map((place) => (
				<Link
					key={place.to}
					to={place.to}
					params={{ site }}
					activeOptions={{ exact: place.exact }}
					aria-current={place.active(pathname) ? "page" : undefined}
					className={item}
				>
					<place.icon className="size-5" /> {place.label}
				</Link>
			))}
		</nav>
	);
}
