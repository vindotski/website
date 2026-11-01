import { z } from "zod";
import { type Field, type FieldType, storableString as text } from "./fields.ts";

// Builds the Zod validator for an entry's `data` from its collection's field definitions.
// Postgres doesn't check `data` against the definitions; every write goes through this.

const httpUrl = z.url({ protocol: /^https?$/, error: "Enter a full http(s) URL" });

/** Validator for one field's value (not wrapped in optional). */
export function fieldValueSchema(field: FieldType): z.ZodType {
	switch (field.type) {
		case "text": {
			const s = text().trim();
			return field.required ? s.min(1, "Required") : s;
		}
		case "markdown":
			// Checked, never trimmed: whitespace is part of Markdown.
			return field.required ? text().refine((s) => s.trim() !== "", "Required") : text();
		case "number":
			return z.number();
		case "boolean":
			// Only `true` is stored; false is absent (canonical.ts). Required means "must be on".
			return z.literal(true, { error: field.required ? "Required" : "Expected true or nothing" });
		case "date":
			return z.iso.date();
		case "url":
			return httpUrl;
		case "select":
			return z.enum(field.options as [string, ...string[]], { error: "Pick one of the options" });
		case "list": {
			const list = z.array(fieldValueSchema(field.of));
			return field.required ? list.min(1, "Add at least one") : list;
		}
		case "object":
			return objectSchema(field.fields);
		case "image":
			// src: an absolute URL or a storage path; alt describes the image.
			return z.strictObject({ src: text().trim().min(1), alt: text().trim() });
	}
}

function objectSchema(fields: Field[]) {
	const shape: Record<string, z.ZodType> = {};
	for (const field of fields) {
		const schema = fieldValueSchema(field);
		shape[field.key] = field.required ? schema : schema.optional();
	}
	// Strict: a key the definition doesn't have is an error, never dropped silently.
	return z.strictObject(shape);
}

/** Validator for `entries.data` of a collection with these fields. */
export function buildDataSchema(fields: Field[]) {
	return objectSchema(fields);
}

/** Field errors for display (`path → messages`), or null when valid. */
export function validateData(fields: Field[], data: unknown) {
	const result = buildDataSchema(fields).safeParse(data);
	if (result.success) return { ok: true as const, data: result.data };
	const errors: Record<string, string[]> = {};
	for (const issue of result.error.issues) {
		const path = issue.path.join(".") || "(root)";
		errors[path] = [...(errors[path] ?? []), issue.message];
	}
	return { ok: false as const, errors };
}
