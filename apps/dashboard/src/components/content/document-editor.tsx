import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DocumentImages } from "#/components/content/document-images";
import {
	type Conflict,
	ConflictNotice,
	LeaveDialog,
	NameDialog,
} from "#/components/content/editor-parts";
import { MarkdownPreview } from "#/components/content/markdown";
import { FileErrors, SourceEditor } from "#/components/content/source-editor";
import { useEditorBridge } from "#/components/layouts/editor-context";
import { FileHeader } from "#/components/layouts/file-header";
import { EditorFrame, InspectorSection } from "#/components/layouts/inspector";
import { STATUS_LABEL, StatusDot } from "#/components/layouts/status-dot";
import { DateTime } from "#/components/status-badge";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { useShortcutLabel } from "#/hooks/use-shortcut-label";
import { useSite } from "#/hooks/use-site";
import { joinPath, type OwnedField, SLUG } from "#/lib/content/fields";
import { bodyOf, documentFile } from "#/lib/content/files";
import { copyText } from "#/lib/copy";
import { CONTENT_KEY, documentImagesQuery, entrySourceQuery } from "#/lib/files/queries";
import { deleteEntry, setEntryStatus } from "#/server/content.functions";
import type { CollectionSummary, EntryDetail } from "#/server/content.server";
import { renameEntry, saveEntryFile } from "#/server/files.functions";

// A document, edited as its file: `<path>/index.md` (front matter + Markdown). The inspector has
// what isn't text: publishing, the folder's fields for reference, and delete. Docs: Documents.

type Source = { id: string; text: string; version: string };

export function DocumentEditor({
	collection,
	entry,
	source,
	newSlug,
}: {
	collection: CollectionSummary;
	/** The saved document (status, who saved it); absent for a new one. */
	entry?: EntryDetail;
	/** Its file as saved, or a new file's template. */
	source: Source;
	/** A new document's name, asked for before it opens. */
	newSlug?: string;
}) {
	const site = useSite();
	const label = useShortcutLabel();
	const isNew = !entry;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const saveFn = useServerFn(saveEntryFile);
	const statusFn = useServerFn(setEntryStatus);
	const deleteFn = useServerFn(deleteEntry);
	const renameFn = useServerFn(renameEntry);
	const [renaming, setRenaming] = useState(false);

	const [text, setText] = useState(source.text);
	const [base, setBase] = useState(isNew ? "" : source.text);
	const [version, setVersion] = useState(isNew ? undefined : source.version);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [conflict, setConflict] = useState<Conflict | null>(null);
	const [pending, setPending] = useState<"save" | "status" | "rename" | "delete" | null>(null);
	const [view, setView] = useState<"source" | "preview">("source");
	const leaving = useRef(false);
	const conflictRef = useRef<HTMLDivElement>(null);

	const dirty = text !== base;
	const blocker = useBlocker({
		shouldBlockFn: () => dirty && !leaving.current,
		enableBeforeUnload: () => dirty && !leaving.current,
		withResolver: true,
	});

	const slug = entry?.slug ?? newSlug ?? "untitled";
	const path = documentFile(joinPath(collection.slug, slug));
	const status = entry?.status ?? "draft";
	const busy = pending !== null;

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
	}

	async function save() {
		if (!dirty && !isNew) return;
		setPending("save");
		try {
			const result = await saveFn({
				data: {
					collection: collection.slug,
					entryId: entry?.id,
					slug,
					text,
					expectedUpdatedAt: version,
				},
			});
			if (!result.ok) {
				if (result.conflict) setConflict(result.conflict);
				setErrors(result.fieldErrors ?? (result.error ? { "(file)": [result.error] } : {}));
				toast.error(
					result.conflict ? "Someone else saved this file in the meantime." : "Fix the file first.",
				);
				return;
			}
			setErrors({});
			await refresh();
			if (isNew) {
				leaving.current = true;
				toast.success(`Created ${slug}`);
				await navigate({
					to: "/$site/files/$",
					params: { site, _splat: joinPath(collection.slug, slug) },
					search: {},
					replace: true,
				});
				return;
			}
			// What's stored is the canonical form: show exactly that.
			const saved = await queryClient.fetchQuery(entrySourceQuery(result.id));
			const next = saved.ok ? saved.text : text;
			setText(next);
			setBase(next);
			setVersion(result.updatedAt);
			toast.success("Saved");
		} catch {
			toast.error("Couldn't save. Try again.");
		} finally {
			setPending(null);
		}
	}

	async function changeStatus(intent: "publish" | "unpublish") {
		if (!entry) return;
		if (dirty) {
			toast.error("Save or undo your changes first.");
			return;
		}
		setPending("status");
		try {
			const result = await statusFn({ data: { id: entry.id, intent, expectedUpdatedAt: version } });
			if (!result.ok) {
				if (result.conflict) setConflict(result.conflict);
				toast.error(
					result.error ??
						(result.conflict ? "Someone else saved this file." : "Fix the file first."),
				);
				return;
			}
			await refresh();
			const saved = await queryClient.fetchQuery(entrySourceQuery(entry.id));
			if (saved.ok) {
				setText(saved.text);
				setBase(saved.text);
				setVersion(saved.version);
			}
			toast.success(intent === "publish" ? "Published" : "Unpublished");
		} catch {
			toast.error(`Couldn't ${intent}. Try again.`);
		} finally {
			setPending(null);
		}
	}

	async function rename(next: string) {
		if (!entry) return;
		setPending("rename");
		try {
			const result = await renameFn({
				data: { id: entry.id, slug: next, expectedUpdatedAt: version },
			});
			if (!result.ok) {
				toast.error(
					result.fieldErrors?.slug?.[0] ??
						(result.conflict ? "Someone just saved this file. Reload first." : result.error) ??
						"Couldn't rename. Try again.",
				);
				return;
			}
			await refresh();
			toast.success(`Renamed to ${next}`);
			leaving.current = true;
			await navigate({
				to: "/$site/files/$",
				params: { site, _splat: joinPath(collection.slug, next) },
				search: {},
				replace: true,
			});
		} catch {
			toast.error("Couldn't rename. Try again.");
		} finally {
			setPending(null);
		}
	}

	async function remove() {
		if (!entry) return;
		setPending("delete");
		try {
			const result = await deleteFn({ data: { id: entry.id } });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			await refresh();
			toast.success("Deleted");
			leaving.current = true;
			await (collection.slug
				? navigate({ to: "/$site/files/$", params: { site, _splat: collection.slug }, search: {} })
				: navigate({ to: "/$site/files", params: { site }, search: {} }));
		} catch {
			toast.error("Couldn't delete. Try again.");
		} finally {
			setPending(null);
		}
	}

	const toggleView = () => setView((v) => (v === "source" ? "preview" : "source"));
	useEditorBridge(
		{ path, dirty: dirty || isNew, saving: pending === "save", conflict: !!conflict, view },
		{
			save: () => void save(),
			publish: entry && status !== "published" ? () => void changeStatus("publish") : undefined,
			toggleView,
			showConflict: () => conflictRef.current?.scrollIntoView({ behavior: "smooth" }),
		},
	);

	const body = bodyOf(text);
	const words = countWords(body);
	// Each image's hash, so a replaced image isn't shown stale in the preview.
	const { data: images } = useQuery({ ...documentImagesQuery(entry?.id ?? ""), enabled: !!entry });
	const imageVersions = new Map(
		images?.images.map((i) => [i.name, i.file.sha256.slice(0, 12)] as const),
	);

	const header = (
		<FileHeader
			path={path}
			dirty={dirty || isNew}
			conflict={!!conflict}
			onConflict={() => conflictRef.current?.scrollIntoView({ behavior: "smooth" })}
			view={
				<Tabs value={view} onValueChange={(v) => setView(v as "source" | "preview")}>
					<TabsList className="h-8">
						<TabsTrigger value="source" className="px-2 text-xs">
							Source
						</TabsTrigger>
						<TabsTrigger value="preview" className="px-2 text-xs">
							Preview
						</TabsTrigger>
					</TabsList>
				</Tabs>
			}
			actions={
				<Button
					size="sm"
					className="h-8"
					disabled={busy || (!dirty && !isNew)}
					title={`Save (${label("mod+s")})`}
					onClick={() => void save()}
				>
					{pending === "save" ? "Saving…" : isNew ? "Create" : dirty ? "Save" : "Saved"}
				</Button>
			}
		/>
	);

	const inspector = (
		<>
			<InspectorSection title="Publish">
				<div className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<StatusDot status={status} />
						{STATUS_LABEL[status]}
					</span>
					{entry?.publishedAt && (
						<span className="text-xs text-muted-foreground" title="Posted on">
							<DateTime value={entry.publishedAt} />
						</span>
					)}
				</div>
				{entry ? (
					status === "published" ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={busy}
							onClick={() => void changeStatus("unpublish")}
						>
							{pending === "status" ? "Unpublishing…" : "Unpublish"}
						</Button>
					) : (
						<Button
							type="button"
							size="sm"
							disabled={busy}
							onClick={() => void changeStatus("publish")}
						>
							{pending === "status" ? "Publishing…" : "Publish now"}
						</Button>
					)
				) : (
					<p className="text-muted-foreground">Create it first; new documents start as drafts.</p>
				)}
				{entry?.updatedAt && (
					<p className="text-xs text-muted-foreground">
						Saved <DateTime value={entry.updatedAt} />
						{entry.updatedBy ? ` by ${entry.updatedBy}` : ""}
					</p>
				)}
				<p className="font-mono text-xs text-muted-foreground">
					{words} {words === 1 ? "word" : "words"}
					{words > 0 && ` · ${Math.max(1, Math.round(words / 230))} min read`}
				</p>
			</InspectorSection>

			<InspectorSection title="Fields">
				<FieldReference fields={collection.fields} folder={collection.slug} />
			</InspectorSection>

			{entry && <DocumentImages documentId={entry.id} />}

			{entry && (
				<InspectorSection title="Meta">
					<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
						<dt>id</dt>
						<dd className="flex min-w-0 items-center gap-1">
							<span className="truncate">{entry.id}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7"
								onClick={() => copyText(entry.id, "the id")}
								aria-label="Copy id"
							>
								<Copy className="size-3" />
							</Button>
						</dd>
					</dl>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() =>
							dirty ? toast.error("Save or undo your changes first.") : setRenaming(true)
						}
					>
						Rename {entry.slug}
					</Button>
				</InspectorSection>
			)}

			{entry && (
				<InspectorSection title="Danger" defaultOpen={false}>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-destructive"
								disabled={busy}
							>
								Delete {entry.slug}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete “{entry.title || entry.slug}”?</AlertDialogTitle>
								<AlertDialogDescription>This can't be undone.</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction variant="destructive" onClick={remove}>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</InspectorSection>
			)}
		</>
	);

	return (
		<EditorFrame header={header} inspector={inspector}>
			<div className="mx-auto grid w-full max-w-4xl gap-3 px-4 py-6 md:px-8">
				{conflict && (
					<ConflictNotice
						conflict={conflict}
						noticeRef={conflictRef}
						onReload={() => {
							leaving.current = true;
							window.location.reload();
						}}
					/>
				)}
				<FileErrors errors={errors} />
				<div className={view === "source" ? "contents" : "hidden"}>
					<SourceEditor
						id="document-source"
						label={path}
						language="markdown"
						value={text}
						onChange={setText}
						invalid={Object.keys(errors).length > 0}
					/>
					<p className="hidden font-mono text-xs text-muted-foreground md:block">
						front matter, then the Markdown body · {label("mod+s")} saves · {label("mod+/")}{" "}
						previews
					</p>
				</div>
				{view === "preview" && (
					<article className="rounded-md border p-6">
						<MarkdownPreview
							source={body}
							body
							imagesAt={entry && `/${site}/media/${entry.path}`}
							imageVersions={imageVersions}
						/>
					</article>
				)}
			</div>
			{renaming && entry && (
				<NameDialog
					title={`Rename ${entry.slug}`}
					description="The name is the document's slug: your site's URL, and its folder."
					label="Name"
					prefix={collection.slug ? `${collection.slug}/` : "/"}
					suffix="/index.md"
					check={(n) =>
						!SLUG.test(n)
							? "Use lowercase letters, digits and single hyphens"
							: n === entry.slug
								? "That's its name already"
								: null
					}
					onSubmit={(n) => {
						setRenaming(false);
						void rename(n);
					}}
					onCancel={() => setRenaming(false)}
				/>
			)}
			<LeaveDialog
				open={blocker.status === "blocked"}
				onStay={() => blocker.reset?.()}
				onLeave={() => blocker.proceed?.()}
			/>
		</EditorFrame>
	);
}

/** The fields a document here has, for writing its front matter. */
export function FieldReference({ fields, folder }: { fields: OwnedField[]; folder: string }) {
	if (!fields.length) {
		return <p className="text-muted-foreground">No fields: just a title, tags and the body.</p>;
	}
	return (
		<ul className="grid gap-1.5 font-mono text-xs">
			{fields.map((f) => (
				<li key={f.key} className="flex items-baseline justify-between gap-2">
					<span className="truncate">
						{f.key}
						{f.required && <span className="text-destructive">*</span>}
					</span>
					<span className="shrink-0 text-muted-foreground">
						{f.type}
						{f.owner !== folder && ` · ${f.owner || "/"}`}
					</span>
				</li>
			))}
		</ul>
	);
}

/** Words in a Markdown body. */
function countWords(text: string) {
	return text
		.replace(/[#*_>`[\]()<>{}|-]/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
}
