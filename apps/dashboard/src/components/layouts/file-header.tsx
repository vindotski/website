import { Link } from "@tanstack/react-router";
import { ChevronLeft, Ellipsis, Eye, EyeOff, PanelRight, TriangleAlert } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { useSite } from "#/hooks/use-site";
import { cn } from "#/lib/utils";
import { useShell } from "./editor-context";

type Crumb = { label: string; to?: ReactNode };

// Parent folders truncate too, so a long path doesn't push the actions off screen.
const crumbLink =
	"min-w-0 max-w-40 truncate rounded-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring";

const folderLink = (site: string, path: string, label: string) =>
	path ? (
		<Link to="/$site/files/$" params={{ site, _splat: path }} className={crumbLink}>
			{label}
		</Link>
	) : (
		<Link to="/$site/files" params={{ site }} className={crumbLink}>
			{label}
		</Link>
	);

/** The folder an open file belongs to: a document's parent, a config's own folder. */
export function folderOfFile(path: string) {
	const dir = path.slice(0, Math.max(0, path.lastIndexOf("/")));
	if (path.endsWith("/index.md")) return dir.slice(0, Math.max(0, dir.lastIndexOf("/")));
	return dir;
}

/** `posts / shipping-small / index.md` — each folder links to its listing. */
export function Breadcrumbs({ path, className }: { path: string; className?: string }) {
	const site = useSite();
	const parts = path.split("/");
	const crumbs: Crumb[] = parts.map((label, i) =>
		i === parts.length - 1
			? { label }
			: { label, to: folderLink(site, parts.slice(0, i + 1).join("/"), label) },
	);
	return (
		<nav
			aria-label="Path"
			className={cn("flex min-w-0 items-center gap-1 font-mono text-xs", className)}
		>
			{crumbs.map((c, i) => (
				<Fragment key={parts.slice(0, i + 1).join("/")}>
					{i > 0 && <span className="text-muted-foreground/60">/</span>}
					{c.to ?? <span className="truncate text-foreground">{c.label}</span>}
				</Fragment>
			))}
		</nav>
	);
}

/** Unsaved changes, beside the file's name. */
function DirtyDot({ className }: { className?: string }) {
	return (
		<span
			className={cn("size-2 shrink-0 rounded-full bg-foreground", className)}
			title="Unsaved changes"
		>
			<span className="sr-only">Unsaved changes</span>
		</span>
	);
}

/** The bar above an open file: path, view toggle, details, actions. */
export function FileHeader({
	path,
	view,
	actions,
	dirty,
	conflict,
	onConflict,
}: {
	path: string;
	view?: ReactNode;
	actions?: ReactNode;
	dirty?: boolean;
	/** Someone else saved first: a red badge that jumps to the notice. */
	conflict?: boolean;
	onConflict?: () => void;
}) {
	const site = useSite();
	const { desktop, wide, toggleInspector, editor, actions: editorActions } = useShell();
	const folder = folderOfFile(path);
	const name = path.split("/").at(-1) ?? path;
	return (
		<header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
			{desktop ? (
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Breadcrumbs path={path} className="min-w-0" />
					{dirty && <DirtyDot />}
				</div>
			) : (
				<>
					<Button variant="ghost" size="icon" className="-ml-1 size-8" asChild>
						{folder ? (
							<Link
								to="/$site/files/$"
								params={{ site, _splat: folder }}
								aria-label={`Back to ${folder}`}
							>
								<ChevronLeft />
							</Link>
						) : (
							<Link to="/$site/files" params={{ site }} aria-label="Back to files">
								<ChevronLeft />
							</Link>
						)}
					</Button>
					<span className="min-w-0 flex-1 truncate font-mono text-xs">
						{name}
						{dirty && <DirtyDot className="ml-1.5 inline-block align-middle" />}
					</span>
				</>
			)}
			{conflict && (
				<button
					type="button"
					onClick={onConflict}
					className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive hover:bg-destructive/20"
				>
					<TriangleAlert className="size-3.5" /> Conflict
				</button>
			)}
			{desktop && view}
			{!wide && desktop && (
				<Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={toggleInspector}>
					<PanelRight className="size-4" />
					Details
				</Button>
			)}
			{/* Phones: Preview as an eye, Save, and the rest of the file's actions under ⋯. */}
			{!desktop && editorActions.current?.toggleView && (
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					onClick={() => editorActions.current?.toggleView?.()}
					aria-label={editor?.view === "preview" ? "Show source" : "Show preview"}
					aria-pressed={editor?.view === "preview"}
				>
					{editor?.view === "preview" ? <EyeOff /> : <Eye />}
				</Button>
			)}
			{actions}
			{!desktop && (
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					onClick={toggleInspector}
					aria-label="Details"
				>
					<Ellipsis />
				</Button>
			)}
		</header>
	);
}
