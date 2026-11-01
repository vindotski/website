import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shown where a page needs more than the signed-in role allows. Every role sees the same pages
 * (roles are being simplified); the server still checks each action.
 */
export function RoleNotice({ children }: { children: ReactNode }) {
	return (
		<div className="m-4 flex items-start gap-3 rounded-md border bg-muted/30 p-4 text-sm">
			<ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<p className="text-muted-foreground">{children}</p>
		</div>
	);
}
