import { describe, expect, it } from "vitest";
import type { Field } from "./fields";
import { validateData } from "./validate";

const fields: Field[] = [
	{ key: "summary", label: "Summary", type: "text", required: true },
	{ key: "year", label: "Year", type: "number" },
	{ key: "live", label: "Live", type: "boolean" },
	{ key: "launched", label: "Launched", type: "date" },
	{ key: "demo_url", label: "Demo", type: "url" },
	{ key: "status", label: "Status", type: "select", options: ["Live", "Archived"], required: true },
	{ key: "stack", label: "Stack", type: "list", of: { type: "text" } },
	{
		key: "years",
		label: "Years",
		type: "object",
		required: true,
		fields: [
			{ key: "start", label: "Start", type: "number", required: true },
			{ key: "end", label: "End", type: "number" },
		],
	},
	{
		key: "socials",
		label: "Socials",
		type: "list",
		of: {
			type: "object",
			fields: [
				{ key: "name", label: "Name", type: "text", required: true },
				{ key: "href", label: "Link", type: "url", required: true },
			],
		},
	},
	{ key: "image", label: "Image", type: "image" },
];

const valid = {
	summary: "Live data, no lag",
	year: 2026,
	live: true,
	launched: "2026-10-31",
	demo_url: "https://example.com",
	status: "Live",
	stack: ["Vue", "GraphQL"],
	years: { start: 2020 },
	socials: [{ name: "GitHub", href: "https://github.com/example" }],
	image: { src: "https://example.com/a.png", alt: "Screenshot" },
};

describe("validateData", () => {
	it("accepts valid data for every field type", () => {
		expect(validateData(fields, valid)).toMatchObject({ ok: true });
	});

	it("only requires required fields", () => {
		expect(validateData(fields, { summary: "x", status: "Live", years: { start: 2020 } }).ok).toBe(
			true,
		);
	});

	it("rejects unknown keys instead of dropping them", () => {
		const result = validateData(fields, { ...valid, removed_field: "old" });
		expect(result.ok).toBe(false);
	});

	it.each([
		["missing required text", { ...valid, summary: undefined }, "summary"],
		["blank required text", { ...valid, summary: "   " }, "summary"],
		["number as text", { ...valid, year: "2026" }, "year"],
		["bad date", { ...valid, launched: "31/10/2026" }, "launched"],
		["non-http url", { ...valid, demo_url: "javascript:alert(1)" }, "demo_url"],
		["unknown select option", { ...valid, status: "Gone" }, "status"],
		["missing nested required", { ...valid, years: {} }, "years.start"],
		["invalid list item", { ...valid, socials: [{ name: "X", href: "nope" }] }, "socials.0.href"],
		["image without src", { ...valid, image: { src: "", alt: "x" } }, "image.src"],
	])("rejects %s", (_name, data, path) => {
		const result = validateData(fields, data);
		expect(result.ok).toBe(false);
		expect(result.ok ? {} : result.errors).toHaveProperty([path]);
	});
});
