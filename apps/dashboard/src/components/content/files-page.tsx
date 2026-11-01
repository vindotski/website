import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { z } from "zod";
import { ConfigEditor } from "#/components/content/config-editor";
import { DocumentEditor } from "#/components/content/document-editor";
import { MasterDetail } from "#/components/layouts/master-detail";
import { RoleNotice } from "#/components/layouts/role-notice";
import { parentOf, slugOf } from "#/lib/content/fields";
import { documentTemplate } from "#/lib/content/files";
import { folderOf, resolvePath } from "#/lib/files/folders";
import {
	collectionsQuery,
	contentTypeQuery,
	entryQuery,
	entrySourceQuery,
	filesQuery,
} from "#/lib/files/queries";
import { canManageContentTypes, canUseDashboard } from "#/lib/roles";
import type { CurrentUser } from "#/server/auth.server";
import { FolderView } from "./folder-view";

// /<site>/files/<path>: the path decides what's shown — a folder (the list), a document (its index.md),
// a folder's _config.json, or a new file (`?new=document|folder`, after its name was asked).
// The section layout (routes/_dashboard/$site/files.tsx) owns the list; the child route renders the file.
// Docs: Documents.

export const filesSearch = z.object({
	/** A new document or folder at this path. */
	new: z.enum(["document", "folder"]).optional(),
});
export type FilesSearch = z.infer<typeof filesSearch>;

export async function loadFiles(
	queryClient: QueryClient,
	user: CurrentUser,
	path: string,
	search: FilesSearch,
) {
	// Every role sees the same pages; what a role can't load isn't asked for (FilesSection says so).
	if (!canUseDashboard(user.role)) return;
	const admin = canManageContentTypes(user.role);
	const rows = await queryClient.ensureQueryData(filesQuery);
	if (search.new === "document") {
		const collections = await queryClient.ensureQueryData(collectionsQuery);
		if (!collections.some((c) => c.slug === parentOf(path))) throw notFound();
		return;
	}
	if (search.new === "folder") {
		if (!rows.some((r) => r.path === parentOf(path) && r.kind === "folder")) throw notFound();
		return;
	}
	const resolved = resolvePath(rows, path);
	if (resolved.kind === "missing") throw notFound();
	if (resolved.kind === "config") {
		if (admin && !(await queryClient.ensureQueryData(contentTypeQuery(resolved.path)))) {
			throw notFound();
		}
	}
	if (resolved.kind === "document") {
		const [collections, entry, source] = await Promise.all([
			queryClient.ensureQueryData(collectionsQuery),
			queryClient.ensureQueryData(entryQuery(resolved.id)),
			queryClient.ensureQueryData(entrySourceQuery(resolved.id)),
		]);
		if (!entry || !source.ok || !collections.some((c) => c.slug === entry.collection)) {
			throw notFound();
		}
	}
}

const ADMINS_ONLY = "Only admins can create folders and change configs.";

/**
 * The Files section (its layout route): the folder you're in as the list, and the open file —
 * whatever the child route renders into `detail` — beside or after it.
 */
export function FilesSection({
	user,
	path,
	search,
	detail,
}: {
	user: CurrentUser;
	path: string;
	search: FilesSearch;
	detail: ReactNode;
}) {
	if (!canUseDashboard(user.role)) {
		return (
			<RoleNotice>You don't have access to this site's files. Ask an admin to add you.</RoleNotice>
		);
	}
	return (
		<Files path={path} search={search} detail={detail} admin={canManageContentTypes(user.role)} />
	);
}

function Files({
	path,
	search,
	detail,
	admin,
}: {
	path: string;
	search: FilesSearch;
	detail: ReactNode;
	admin: boolean;
}) {
	const { data: rows } = useSuspenseQuery(filesQuery);
	const resolved = resolvePath(rows, path);
	const creating = search.new !== undefined;
	const isFolder = resolved.kind === "folder" && !creating;
	// The list is the folder you're in: the folder itself, or the one an open (or new) file is in.
	const folder = isFolder ? path : creating ? parentOf(path) : folderOf(rows, path);
	return (
		<MasterDetail
			id="files"
			master={<FolderView key={folder} rows={rows} path={folder} canManageFolders={admin} />}
			detail={isFolder ? undefined : detail}
			empty={<p>Select a file, or add one with New file.</p>}
		/>
	);
}

/** What `/<site>/files/<path>` opens beside its folder: a document, a config, or a new file. */
export function FileDetail({
	user,
	path,
	search,
}: {
	user: CurrentUser;
	path: string;
	search: FilesSearch;
}) {
	const admin = canManageContentTypes(user.role);
	const { data: rows } = useSuspenseQuery(filesQuery);
	if (search.new === "document") {
		return <NewDocument key={path} path={path} />;
	}
	if (search.new === "folder") {
		return admin ? (
			<ConfigEditor key={path} newPath={path} />
		) : (
			<RoleNotice>{ADMINS_ONLY}</RoleNotice>
		);
	}
	const resolved = resolvePath(rows, path);
	switch (resolved.kind) {
		case "folder":
			return null;
		case "document":
			return <OpenDocument key={resolved.id} id={resolved.id} />;
		case "config":
			return admin ? (
				<OpenConfig key={resolved.path} path={resolved.path} />
			) : (
				<RoleNotice>{ADMINS_ONLY}</RoleNotice>
			);
		default:
			throw notFound();
	}
}

function OpenDocument({ id }: { id: string }) {
	const { data: collections } = useSuspenseQuery(collectionsQuery);
	const { data: entry } = useSuspenseQuery(entryQuery(id));
	const { data: source } = useSuspenseQuery(entrySourceQuery(id));
	const collection = collections.find((c) => c.slug === entry?.collection);
	if (!entry || !source.ok || !collection) throw notFound();
	// After a save the editor keeps its own text; it starts over when another file opens.
	return (
		<DocumentEditor
			collection={collection}
			entry={entry}
			source={{ id, text: source.text, version: source.version }}
		/>
	);
}

function NewDocument({ path }: { path: string }) {
	const { data: collections } = useSuspenseQuery(collectionsQuery);
	const [id] = useState(() => crypto.randomUUID());
	const collection = collections.find((c) => c.slug === parentOf(path));
	if (!collection) throw notFound();
	return (
		<DocumentEditor
			collection={collection}
			newSlug={slugOf(path)}
			source={{ id, text: documentTemplate(collection.fields, id), version: "" }}
		/>
	);
}

function OpenConfig({ path }: { path: string }) {
	const { data: type } = useSuspenseQuery(contentTypeQuery(path));
	if (!type) throw notFound();
	return <ConfigEditor type={type} />;
}
