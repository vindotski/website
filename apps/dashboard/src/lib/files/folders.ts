import type { FileRow } from "#/server/files.server";

// A folder's contents, worked out from the flat list of rows `listFiles` returns. Pure.

const parentOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));
const inside = (path: string, folder: string) =>
	folder === "" ? path !== "" : path.startsWith(`${folder}/`);

export type FolderItem = { path: string; name: string; documents: number };

export type FolderContents = {
	path: string;
	hasConfig: boolean;
	folders: FolderItem[];
	documents: FileRow[];
};

/** What a folder holds directly: subfolders (with the documents below them) and documents. */
export function folderContents(rows: FileRow[], path: string): FolderContents | null {
	const self = rows.find((r) => r.path === path && r.kind === "folder");
	if (!self) return null;
	const children = rows.filter((r) => r.path !== "" && parentOf(r.path) === path);
	return {
		path,
		hasConfig: self.hasConfig,
		folders: children
			.filter((r) => r.kind === "folder")
			.map((f) => ({
				path: f.path,
				name: f.title,
				documents: rows.filter((r) => r.kind === "document" && inside(r.path, f.path)).length,
			})),
		documents: children.filter((r) => r.kind === "document"),
	};
}

export type Resolved =
	| { kind: "folder"; path: string }
	| { kind: "document"; path: string; id: string }
	| { kind: "config"; path: string }
	| { kind: "missing"; path: string };

/** What a `/files/<path>` URL shows: a folder, a document, a folder's `_config.json`, or nothing. */
export function resolvePath(rows: FileRow[], path: string): Resolved {
	if (path === "_config.json" || path.endsWith("/_config.json")) {
		// Any folder's (an empty one if it has no fields yet), but not the root's for now.
		const folder = path === "_config.json" ? "" : path.slice(0, -"/_config.json".length);
		const row = rows.find((r) => r.path === folder && r.kind === "folder");
		return row && folder ? { kind: "config", path: folder } : { kind: "missing", path };
	}
	const row = rows.find((r) => r.path === path);
	if (!row) return { kind: "missing", path };
	return row.kind === "document"
		? { kind: "document", path, id: row.id }
		: { kind: "folder", path };
}

/** The folder a path sits in (for a folder, itself). */
export function folderOf(rows: FileRow[], path: string) {
	const resolved = resolvePath(rows, path);
	if (resolved.kind === "folder" || resolved.kind === "config") return resolved.path;
	return parentOf(path);
}

export function counts(rows: FileRow[]) {
	const documents = rows.filter((r) => r.kind === "document");
	return {
		published: documents.filter((d) => d.status === "published").length,
		draft: documents.filter((d) => d.status === "draft").length,
	};
}

/**
 * Names already used directly in a folder, by documents and folders alike: their slugs (the last
 * part of the path), which is what a new name must not repeat. Not titles.
 */
export function takenNames(rows: FileRow[], folder: string) {
	const prefix = folder ? `${folder}/` : "";
	return new Set(
		rows
			.filter(
				// Not the root itself (path ''), and only what's directly in the folder.
				(r) =>
					r.path !== "" && r.path.startsWith(prefix) && !r.path.slice(prefix.length).includes("/"),
			)
			.map((r) => r.path.slice(prefix.length)),
	);
}
