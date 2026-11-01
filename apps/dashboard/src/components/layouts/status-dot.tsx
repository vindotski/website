import { cn } from "#/lib/utils";
import type { DisplayStatus } from "#/server/content.server";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
	published: "Published",
	draft: "Draft",
};

const DOT: Record<DisplayStatus, string> = {
	published: "bg-status-published",
	draft: "bg-status-draft",
};

export function StatusDot({ status, className }: { status: DisplayStatus; className?: string }) {
	return (
		<>
			<span
				className={cn("inline-block size-2 shrink-0 rounded-full", DOT[status], className)}
				title={STATUS_LABEL[status]}
				aria-hidden="true"
			/>
			<span className="sr-only">{STATUS_LABEL[status]}</span>
		</>
	);
}
