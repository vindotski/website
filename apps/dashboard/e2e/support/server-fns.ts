import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Server function ids are hashes that change whenever a file changes, so read them from the build
// under test: the server bundle declares each one as createServerRpc({ id, name, filename }).

const SERVER_DIR = ".output/server";
const RPC_DECL =
	/createServerRpc\(\{\s*id:\s*"([a-f0-9]{16,})",\s*name:\s*"([^"]+)",\s*filename:\s*"([^"]+)"/g;

let ids: Map<string, string> | undefined;

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules") continue;
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) yield* walk(path);
		else if (path.endsWith(".mjs")) yield path;
	}
}

function scan() {
	const map = new Map<string, string>();
	for (const file of walk(SERVER_DIR)) {
		for (const [, id, name, filename] of readFileSync(file, "utf8").matchAll(RPC_DECL)) {
			map.set(`${filename}#${name}`, id);
		}
	}
	return map;
}

/** RPC id of `export const <name> = createServerFn(...)` in `<filename>` (repo-relative). */
export function serverFnId(filename: string, name: string): string {
	ids ??= scan();
	const id = ids.get(`${filename}#${name}`);
	if (!id) {
		throw new Error(
			`Server function ${filename}#${name} not in the build — stale build? Run pnpm build.`,
		);
	}
	return id;
}

export type ServerFnRef = { file: string; name: string };
export const fn = (file: string, name: string): ServerFnRef => ({ file, name });
