import { describe, expect, it } from "vitest";
import { combineFields, configSchema, type Field, fieldsSchema, pathChain } from "./fields";

describe("field definitions", () => {
	it("accepts every field type, including nested list and object", () => {
		const fields: Field[] = [
			{ key: "summary", label: "Summary", type: "text", required: true, multiline: true },
			{ key: "about", label: "About", type: "markdown" },
			{ key: "year", label: "Year", type: "number" },
			{ key: "featured", label: "Featured", type: "boolean" },
			{ key: "launched", label: "Launched", type: "date" },
			{ key: "demo_url", label: "Demo", type: "url" },
			{ key: "status", label: "Status", type: "select", options: ["Live", "Archived"] },
			{ key: "stack", label: "Stack", type: "list", of: { type: "text" } },
			{
				key: "years",
				label: "Years",
				type: "object",
				fields: [{ key: "start", label: "Start", type: "number", required: true }],
			},
			{ key: "image", label: "Image", type: "image" },
		];
		expect(fieldsSchema.safeParse(fields).success).toBe(true);
	});

	it.each([
		["missing label", [{ key: "a", type: "text" }]],
		["invalid key", [{ key: "Bad Key", label: "A", type: "text" }]],
		[
			"duplicate keys",
			[
				{ key: "a", label: "A", type: "text" },
				{ key: "a", label: "B", type: "url" },
			],
		],
		["unknown type", [{ key: "a", label: "A", type: "color" }]],
		["a removed type (email)", [{ key: "a", label: "A", type: "email" }]],
		["a removed option (maxLength)", [{ key: "a", label: "A", type: "text", maxLength: 9 }]],
		["a removed type (reference)", [{ key: "a", label: "A", type: "reference", folders: ["w"] }]],
		["empty select", [{ key: "a", label: "A", type: "select", options: [] }]],
		["duplicate options", [{ key: "a", label: "A", type: "select", options: ["x", "x"] }]],
		[
			"nested object with invalid field",
			[{ key: "a", label: "A", type: "object", fields: [{ key: "b", type: "text" }] }],
		],
	])("rejects %s", (_name, fields) => {
		expect(fieldsSchema.safeParse(fields).success).toBe(false);
	});

	it("validates configs", () => {
		const base = { fields: [] };
		expect(configSchema.safeParse(base).success).toBe(true);
		expect(configSchema.safeParse({ ...base, slug: "posts" }).success).toBe(false);
		for (const key of [
			"published_at",
			"status",
			"tags",
			"type",
			"links",
			"relationships",
			"meta",
		]) {
			const reserved = { fields: [{ key, label: "P", type: "boolean" }] };
			expect(configSchema.safeParse(reserved).success, key).toBe(false);
		}
		const free = {
			fields: [{ key: "topics", label: "Topics", type: "list", of: { type: "text" } }],
		};
		expect(configSchema.safeParse(free).success).toBe(true);
	});
});

describe("combineFields", () => {
	const text = (key: string): Field => ({ key, label: key, type: "text" });

	it("adds each config from the root down, its own last", () => {
		const combined = combineFields([
			{ path: "", config: { fields: [text("seo_title")] } },
			{ path: "posts", config: { fields: [text("summary")] } },
			{ path: "posts/tutorials", config: null },
			{ path: "posts/tutorials/expo", config: { fields: [text("difficulty")] } },
		]);
		expect(combined.ok && combined.fields.map((f) => [f.key, f.owner])).toEqual([
			["seo_title", ""],
			["summary", "posts"],
			["difficulty", "posts/tutorials/expo"],
		]);
	});

	it("refuses a name defined twice along the chain", () => {
		const combined = combineFields([
			{ path: "posts", config: { fields: [text("summary")] } },
			{ path: "posts/tutorials", config: { fields: [text("summary")] } },
		]);
		expect(combined).toEqual({
			ok: false,
			clash: { key: "summary", paths: ["posts", "posts/tutorials"] },
		});
	});

	it("walks paths from the root", () => {
		expect(pathChain("")).toEqual([""]);
		expect(pathChain("a/b/c")).toEqual(["", "a", "a/b", "a/b/c"]);
	});
});
