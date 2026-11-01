import { describe, expect, it } from "vitest";
import { matchShortcut } from "#/lib/shell/shortcuts";
import type { FileRow } from "#/server/files.server";
import { activityOf, pathOfFiles } from "./activity";
import { counts, folderContents, folderOf, resolvePath, takenNames } from "./folders";

describe("shortcuts", () => {
	const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
		({
			key: k,
			metaKey: false,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			...mods,
		}) as KeyboardEvent;

	it("matches ⌘ on Apple and Ctrl elsewhere", () => {
		expect(matchShortcut(key("s", { metaKey: true }), true)).toBe("mod+s");
		expect(matchShortcut(key("s", { ctrlKey: true }), true)).toBeNull();
		expect(matchShortcut(key("S", { ctrlKey: true }), false)).toBe("mod+s");
		expect(matchShortcut(key("I", { ctrlKey: true, shiftKey: true }), false)).toBe("mod+shift+i");
		expect(matchShortcut(key("/", { metaKey: true }), true)).toBe("mod+/");
		expect(matchShortcut(key("s"), true)).toBeNull();
		expect(matchShortcut(key("s", { metaKey: true, altKey: true }), true)).toBeNull();
		expect(matchShortcut(key("x", { metaKey: true }), true)).toBeNull();
	});
});

const row = (r: Partial<FileRow> & Pick<FileRow, "path" | "kind">): FileRow => ({
	id: r.path || "root",
	title: r.path.split("/").at(-1) ?? "",
	status: r.kind === "document" ? "draft" : null,
	invalid: false,
	hasConfig: false,
	updatedAt: "",
	...r,
});

const rows: FileRow[] = [
	row({ path: "", kind: "folder" }),
	row({ path: "posts", kind: "folder", hasConfig: true }),
	row({ path: "posts/hello", kind: "document", id: "1", title: "Hello" }),
	row({ path: "posts/hello/images", kind: "folder" }),
	row({ path: "posts/tutorials", kind: "folder" }),
	row({ path: "posts/tutorials/expo", kind: "document", id: "2", status: "published" }),
	row({ path: "profile", kind: "document", id: "3" }),
];

describe("folders", () => {
	it("lists a folder's subfolders (with documents below) and documents", () => {
		const posts = folderContents(rows, "posts");
		expect(posts?.folders).toEqual([{ path: "posts/tutorials", name: "tutorials", documents: 1 }]);
		expect(posts?.documents.map((d) => d.id)).toEqual(["1"]);
		expect(folderContents(rows, "")?.documents.map((d) => d.id)).toEqual(["3"]);
		expect(folderContents(rows, "nope")).toBeNull();
		expect(counts(rows)).toEqual({ published: 1, draft: 2 });
	});

	it("resolves a URL path to a folder, a document or a config", () => {
		expect(resolvePath(rows, "posts")).toEqual({ kind: "folder", path: "posts" });
		expect(resolvePath(rows, "posts/hello")).toEqual({
			kind: "document",
			path: "posts/hello",
			id: "1",
		});
		expect(resolvePath(rows, "posts/_config.json")).toEqual({ kind: "config", path: "posts" });
		expect(resolvePath(rows, "posts/tutorials/_config.json").kind).toBe("config");
		expect(resolvePath(rows, "_config.json").kind).toBe("missing");
		expect(resolvePath(rows, "posts/nope").kind).toBe("missing");
		expect(folderOf(rows, "posts/hello")).toBe("posts");
		expect(folderOf(rows, "posts/_config.json")).toBe("posts");
	});

	it("checks new names against slugs, not titles", () => {
		// "posts/hello" is titled "Hello": the slug is what a new name must not repeat.
		expect([...takenNames(rows, "posts")].sort()).toEqual(["hello", "tutorials"]);
		expect(takenNames(rows, "posts").has("Hello")).toBe(false);
		expect([...takenNames(rows, "")].sort()).toEqual(["posts", "profile"]);
	});
});

describe("places", () => {
	it("knows which paths are in Files", () => {
		expect(activityOf("/files")).toBe("files");
		expect(activityOf("/files/posts/hello")).toBe("files");
		expect(activityOf("/filesx")).toBeNull();
		expect(activityOf("/")).toBeNull();
		expect(pathOfFiles("/files/posts/hello")).toBe("posts/hello");
	});
});
