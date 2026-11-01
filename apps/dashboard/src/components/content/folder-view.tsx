import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, FileCode, Folder, Plus, TriangleAlert } from "lucide-react";
import { type ReactNode, useState } from "react";
import { LIST_ROW } from "#/components/layouts/master-detail";
import { ScreenHeader } from "#/components/layouts/screen-header";
import { StatusDot } from "#/components/layouts/status-dot";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useSite } from "#/hooks/use-site";
import { joinPath, SLUG } from "#/lib/content/fields";
import { folderContents, takenNames } from "#/lib/files/folders";
import { cn } from "#/lib/utils";
import type { FileRow } from "#/server/files.server";
import { NameDialog } from "./editor-parts";

// One folder, like a phone's file manager: its _config.json, subfolders, then documents
// — the order of an export. The same view fills a phone screen and sits beside an open file on
// wide screens. Docs: Documents.

const parentOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));

function FileLink({
	path,
	children,
	className,
}: {
	path: string;
	children: ReactNode;
	className?: string;
}) {
	const site = useSite();
	return path ? (
		<Link to="/$site/files/$" params={{ site, _splat: path }} className={cn(LIST_ROW, className)}>
			{children}
		</Link>
	) : (
		<Link to="/$site/files" params={{ site }} className={cn(LIST_ROW, className)}>
			{children}
		</Link>
	);
}

export function FolderView({
	rows,
	path,
	canManageFolders = true,
}: {
	rows: FileRow[];
	path: string;
	/** Admins and up: "New folder", and the folder's `_config.json` row. */
	canManageFolders?: boolean;
}) {
	const site = useSite();
	const navigate = useNavigate();
	const [ask, setAsk] = useState<"file" | "folder" | null>(null);
	const contents = folderContents(rows, path);
	if (!contents) return null;
	const taken = takenNames(rows, path);
	const prefix = path ? `${path}/` : "";

	const back = path
		? parentOf(path)
			? {
					to: "/$site/files/$" as const,
					params: { site, _splat: parentOf(path) },
					label: "Up a folder",
				}
			: { to: "/$site/files" as const, label: "Up to the top" }
		: undefined;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ScreenHeader
				mono
				title={path ? `${path}/` : "Files"}
				back={back}
				action={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-8"
								aria-label="New file or folder"
							>
								<Plus className="size-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={() => setAsk("file")}>New file</DropdownMenuItem>
							{canManageFolders && (
								<DropdownMenuItem onSelect={() => setAsk("folder")}>New folder</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>
			<nav aria-label={path ? `${path}/` : "Files"} className="min-h-0 flex-1 overflow-y-auto">
				{path && canManageFolders && (
					<FileLink path={joinPath(path, "_config.json")}>
						<FileCode className="size-4 shrink-0 text-muted-foreground" />
						<span className="flex-1 font-mono text-xs">
							_config.json
							{!contents.hasConfig && (
								<span className="ml-2 font-sans text-muted-foreground">no fields of its own</span>
							)}
						</span>
					</FileLink>
				)}
				{contents.folders.map((f) => (
					<FileLink key={f.path} path={f.path}>
						<Folder className="size-4 shrink-0 text-muted-foreground" />
						<span className="flex-1 truncate font-mono">{f.name}/</span>
						<span className="text-xs text-muted-foreground">
							{f.documents}
							<span className="sr-only"> documents</span>
						</span>
						<ChevronRight className="size-4 text-muted-foreground" />
					</FileLink>
				))}
				{contents.documents.map((d) => (
					<FileLink key={d.id} path={d.path}>
						<StatusDot status={d.status ?? "draft"} />
						<span className="grid min-w-0 flex-1">
							<span className="truncate">{d.title || "Untitled"}</span>
							<span className="truncate font-mono text-xs text-muted-foreground">
								{d.path.slice(prefix.length)}
							</span>
						</span>
						{d.invalid && (
							<span title="Needs attention">
								<TriangleAlert className="size-4 text-amber-500" aria-hidden />
								<span className="sr-only">Needs attention</span>
							</span>
						)}
						<ChevronRight className="size-4 text-muted-foreground" />
					</FileLink>
				))}
				{!contents.folders.length && !contents.documents.length && (
					<p className="p-4 text-sm text-muted-foreground">Empty. Add one with New file.</p>
				)}
			</nav>
			{ask && (
				<NameDialog
					title={ask === "file" ? "New file" : "New folder"}
					description={
						ask === "file"
							? "Its name is the document's slug: your site's URL, and its folder."
							: "A folder for documents; its _config.json can add fields for them."
					}
					label="Name"
					prefix={prefix || "/"}
					suffix={ask === "file" ? "/index.md" : "/"}
					check={(name) =>
						!SLUG.test(name)
							? "Use lowercase letters, digits and single hyphens"
							: taken.has(name)
								? "Already used in this folder"
								: null
					}
					onSubmit={(name) => {
						setAsk(null);
						void navigate({
							to: "/$site/files/$",
							params: { site, _splat: joinPath(path, name) },
							search: { new: ask === "file" ? "document" : "folder" },
						});
					}}
					onCancel={() => setAsk(null)}
				/>
			)}
		</div>
	);
}
