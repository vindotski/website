import { useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { type Conflict, ConflictNotice, LeaveDialog } from "#/components/content/editor-parts";
import { FileErrors, SourceEditor } from "#/components/content/source-editor";
import { useEditorBridge } from "#/components/layouts/editor-context";
import { FileHeader } from "#/components/layouts/file-header";
import { EditorFrame, InspectorSection } from "#/components/layouts/inspector";
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
import { useShortcutLabel } from "#/hooks/use-shortcut-label";
import { useSite } from "#/hooks/use-site";
import { configFile, configToJson, jsonToConfig } from "#/lib/content/files";
import { CONTENT_KEY } from "#/lib/files/queries";
import {
	createContentType,
	deleteContentType,
	saveContentType,
} from "#/server/content-types.functions";
import type { ContentType } from "#/server/content-types.server";

// A folder's `_config.json`, edited as JSON. Saving never rewrites documents: those that no longer
// fit are marked as needing attention. Docs: Folders and fields.

export const EMPTY_CONFIG = configToJson({ fields: [] });

export function ConfigEditor({ type, newPath }: { type?: ContentType; newPath?: string }) {
	const site = useSite();
	const label = useShortcutLabel();
	const isNew = !type;
	const folder = type?.slug ?? newPath ?? "";
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const createFn = useServerFn(createContentType);
	const saveFn = useServerFn(saveContentType);
	const deleteFn = useServerFn(deleteContentType);

	const initial = type ? configToJson({ fields: type.fields }) : EMPTY_CONFIG;
	const [text, setText] = useState(initial);
	const [base, setBase] = useState(isNew ? "" : initial);
	const [updatedAt, setUpdatedAt] = useState(type?.updatedAt);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [conflict, setConflict] = useState<Conflict | null>(null);
	const [pending, setPending] = useState(false);
	const leaving = useRef(false);
	const conflictRef = useRef<HTMLDivElement>(null);

	const dirty = text !== base;
	const blocker = useBlocker({
		shouldBlockFn: () => dirty && !leaving.current,
		enableBeforeUnload: () => dirty && !leaving.current,
		withResolver: true,
	});
	const path = configFile(folder);

	function fail(result: {
		error?: string;
		fieldErrors?: Record<string, string[]>;
		conflict?: { updatedAt: string };
	}) {
		if (result.conflict) {
			setConflict(result.conflict);
			toast.error("Someone else changed this config in the meantime.");
			return;
		}
		setErrors({
			...(result.fieldErrors ?? {}),
			...(result.error ? { "(file)": [result.error] } : {}),
		});
		toast.error(result.error ?? "Fix the file first.");
	}

	async function save() {
		if (!dirty && !isNew) return;
		const config = jsonToConfig(text);
		if (!config.ok) {
			setErrors(config.errors);
			toast.error("Fix the file first.");
			return;
		}
		setErrors({});
		setPending(true);
		try {
			if (isNew) {
				const result = await createFn({ data: { slug: folder, fields: config.value.fields } });
				if (!result.ok) return fail(result);
				await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
				toast.success(`Created ${folder}/`);
				leaving.current = true;
				await navigate({
					to: "/$site/files/$",
					params: { site, _splat: `${result.slug}/_config.json` },
					search: {},
					replace: true,
				});
				return;
			}
			// Documents aren't rewritten: those that no longer fit are marked as needing attention.
			const result = await saveFn({
				data: {
					slug: folder,
					expectedUpdatedAt: updatedAt ?? "",
					values: { slug: folder, fields: config.value.fields },
				},
			});
			if (!result.ok) return fail(result);
			await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
			// What's stored is the canonical form: show exactly that.
			const saved = configToJson(config.value);
			setText(saved);
			setBase(saved);
			setUpdatedAt(result.updatedAt);
			toast.success("Saved");
		} catch {
			toast.error("Couldn't save. Try again.");
		} finally {
			setPending(false);
		}
	}

	async function remove() {
		setPending(true);
		try {
			const result = await deleteFn({ data: { slug: folder } });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
			toast.success(`Deleted ${folder}/`);
			leaving.current = true;
			const parent = folder.slice(0, Math.max(0, folder.lastIndexOf("/")));
			await (parent
				? navigate({ to: "/$site/files/$", params: { site, _splat: parent }, search: {} })
				: navigate({ to: "/$site/files", params: { site }, search: {} }));
		} catch {
			toast.error("Couldn't delete. Try again.");
		} finally {
			setPending(false);
		}
	}

	useEditorBridge(
		{ path, dirty: dirty || isNew, saving: pending, conflict: !!conflict, view: "source" },
		{
			save: () => void save(),
			showConflict: () => conflictRef.current?.scrollIntoView({ behavior: "smooth" }),
		},
	);

	const header = (
		<FileHeader
			path={path}
			dirty={dirty || isNew}
			conflict={!!conflict}
			onConflict={() => conflictRef.current?.scrollIntoView({ behavior: "smooth" })}
			actions={
				<Button
					size="sm"
					className="h-8"
					disabled={pending || (!dirty && !isNew)}
					title={`Save (${label("mod+s")})`}
					onClick={() => void save()}
				>
					{pending ? "Saving…" : isNew ? "Create" : dirty ? "Save" : "Saved"}
				</Button>
			}
		/>
	);

	const inspector = (
		<>
			<InspectorSection title="Inherited">
				{type?.inherited.length ? (
					<ul className="grid gap-1.5 font-mono text-xs">
						{type.inherited.map((f) => (
							<li key={f.key} className="flex items-baseline justify-between gap-2">
								<span className="truncate">
									{f.key}
									{f.required && <span className="text-destructive">*</span>}
								</span>
								<span className="shrink-0 text-muted-foreground">
									{f.type} · {f.owner || "/"}
								</span>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground">Nothing from the folders above.</p>
				)}
				<p className="text-xs text-muted-foreground">
					A field name can be defined only once along a path.
				</p>
			</InspectorSection>
			{type && (
				<InspectorSection title="Documents">
					<p>
						{type.entryCount} {type.entryCount === 1 ? "document" : "documents"} below it.
					</p>
					<Link
						to="/$site/files/$"
						params={{ site, _splat: folder }}
						className="text-primary underline"
					>
						Open {folder}/
					</Link>
				</InspectorSection>
			)}
			{type && (
				<InspectorSection title="Danger" defaultOpen={false}>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-destructive"
								disabled={pending}
							>
								Delete {folder}/
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete {folder}/?</AlertDialogTitle>
								<AlertDialogDescription>
									Only an empty folder can be deleted, and only when no reference field points at
									it.
								</AlertDialogDescription>
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
				<SourceEditor
					id="config-source"
					label={path}
					language="json"
					value={text}
					onChange={setText}
					invalid={Object.keys(errors).length > 0}
				/>
				<p className="hidden font-mono text-xs text-muted-foreground md:block">
					the same file content:export writes · documents that no longer fit are marked as needing
					attention
				</p>
			</div>
			<LeaveDialog
				open={blocker.status === "blocked"}
				onStay={() => blocker.reset?.()}
				onLeave={() => blocker.proceed?.()}
			/>
		</EditorFrame>
	);
}
