import type { DocumentRecord } from "./canonical.ts";
import {
	type Config,
	type ConfigLink,
	combineFields,
	type Field,
	PATH,
	pathChain,
	SLUG,
} from "./fields.ts";
import {
	CONFIG_FILE,
	configFile,
	configToJson,
	DOCUMENT_FILE,
	documentFile,
	documentToMarkdown,
	jsonToConfig,
	markdownToDocument,
} from "./files.ts";

// A whole content tree as files and back, for `content:export` / `content:import`:
//
//   _config.json                    the root's config (optional)
//   posts/_config.json              a folder's config
//   posts/shipping-small/index.md   a document (its folder name is its slug)
//   about/_config.json + index.md   a document with its own config
//
// A folder that holds a document's index.md is that document; any other folder is a plain folder.
// Folders exist where files are, so an empty folder without a config isn't kept (like git).

export type TreeFolder = { path: string; config: Config | null };
export type TreeDocument = { config: Config | null; record: DocumentRecord };
export type ContentTree = { folders: TreeFolder[]; documents: TreeDocument[] };

/** The chain of configs for every path in a tree. */
function chainsOf(tree: ContentTree) {
	const configs = new Map<string, Config | null>();
	for (const f of tree.folders) configs.set(f.path, f.config);
	for (const d of tree.documents) configs.set(d.record.path, d.config);
	return (path: string): ConfigLink[] =>
		pathChain(path).map((p) => ({ path: p, config: configs.get(p) ?? null }));
}

/** A document's fields in a tree, or why it has none (a name defined twice along its chain). */
export function treeFields(tree: ContentTree, path: string): Field[] | string {
	const combined = combineFields(chainsOf(tree)(path));
	if (combined.ok) return combined.fields;
	return `"${combined.clash.key}" is defined in both ${combined.clash.paths.map((p) => p || "the root").join(" and ")}`;
}

/** Every file of a tree, by path. Throws if a document's fields can't be worked out. */
export function treeToFiles(tree: ContentTree): Map<string, string> {
	const files = new Map<string, string>();
	for (const folder of tree.folders) {
		if (folder.config) files.set(configFile(folder.path), configToJson(folder.config));
	}
	for (const { config, record } of tree.documents) {
		const fields = treeFields(tree, record.path);
		if (typeof fields === "string") throw new Error(`${record.path}: ${fields}`);
		if (config) files.set(configFile(record.path), configToJson(config));
		files.set(documentFile(record.path), documentToMarkdown(fields, record));
	}
	return new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export type FilesResult = {
	tree: ContentTree;
	/** `file: message` for everything that's wrong; the tree is only usable when empty. */
	problems: string[];
	/** Things worth knowing that aren't wrong, e.g. keys kept in extras. */
	notes: string[];
};

const dirOf = (file: string) => file.slice(0, Math.max(0, file.lastIndexOf("/")));
const nameOf = (file: string) => file.slice(file.lastIndexOf("/") + 1);

/** Reads files (relative paths with `/`) into a tree. */
export function filesToTree(files: Map<string, string>): FilesResult {
	const problems: string[] = [];
	const notes: string[] = [];
	const add = (file: string, errors: Record<string, string[]>) => {
		for (const [key, messages] of Object.entries(errors)) {
			for (const m of messages) problems.push(`${file}: ${key === "(file)" ? "" : `${key}: `}${m}`);
		}
	};

	const documentPaths = new Set<string>();
	const configTexts = new Map<string, string>();
	const folderPaths = new Set<string>([""]);
	for (const file of files.keys()) {
		const dir = dirOf(file);
		const name = nameOf(file);
		if (!PATH.test(dir) || (dir && !dir.split("/").every((part) => SLUG.test(part)))) {
			problems.push(`${file}: folder names use lowercase letters, digits and single hyphens`);
			continue;
		}
		if (name === DOCUMENT_FILE && dir) documentPaths.add(dir);
		else if (name === CONFIG_FILE) configTexts.set(dir, files.get(file) ?? "");
		else {
			problems.push(`${file}: not a Spotcraft file (expected ${CONFIG_FILE} or ${DOCUMENT_FILE})`);
			continue;
		}
		for (const p of pathChain(dir).slice(0, -1)) folderPaths.add(p);
		if (name === CONFIG_FILE) folderPaths.add(dir);
	}
	for (const doc of documentPaths) {
		folderPaths.delete(doc);
		const holder = pathChain(doc)
			.slice(0, -1)
			.find((p) => documentPaths.has(p));
		if (holder)
			problems.push(`${documentFile(doc)}: a document can't sit inside another (${holder})`);
	}

	const configs = new Map<string, Config | null>();
	for (const [dir, text] of configTexts) {
		const parsed = jsonToConfig(text);
		if (parsed.ok) configs.set(dir, parsed.value);
		else add(configFile(dir), parsed.errors);
	}

	const tree: ContentTree = {
		folders: [...folderPaths].sort().map((path) => ({ path, config: configs.get(path) ?? null })),
		documents: [],
	};
	for (const path of [...documentPaths].sort()) {
		const file = documentFile(path);
		const fields = treeFields(
			{
				...tree,
				documents: [{ config: configs.get(path) ?? null, record: { path } as DocumentRecord }],
			},
			path,
		);
		if (typeof fields === "string") {
			problems.push(`${file}: ${fields}`);
			continue;
		}
		const parsed = markdownToDocument(fields, path, files.get(file) ?? "");
		if (!parsed.ok) {
			add(file, parsed.errors);
			continue;
		}
		for (const key of parsed.value.extrasFromFile) notes.push(`${file}: \`${key}\` kept in extras`);
		tree.documents.push({ config: configs.get(path) ?? null, record: parsed.value.record });
	}
	return { tree, problems, notes };
}
