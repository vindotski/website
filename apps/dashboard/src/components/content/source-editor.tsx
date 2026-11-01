import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import { cn } from "#/lib/utils";
import { highlight, theme } from "./markdown";

// A file's text: a document (front matter + Markdown) or a config (JSON). CodeMirror 6,
// client-only: it mounts in an effect.

const yamlHighlight = HighlightStyle.define([
	{ tag: t.propertyName, color: "var(--primary)" },
	{ tag: [t.string, t.special(t.string)], color: "var(--foreground)" },
	{ tag: [t.number, t.bool, t.null], color: "var(--chart-2, var(--primary))" },
	{ tag: [t.comment, t.meta, t.punctuation], color: "var(--muted-foreground)" },
]);

export function SourceEditor({
	id,
	label,
	value,
	onChange,
	language,
	invalid,
}: {
	id?: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	language: "markdown" | "json";
	invalid?: boolean;
}) {
	const host = useRef<HTMLDivElement>(null);
	const view = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const initial = useRef(value);

	useEffect(() => {
		if (!host.current) return;
		const editor = new EditorView({
			parent: host.current,
			state: EditorState.create({
				doc: initial.current,
				extensions: [
					history(),
					lineNumbers(),
					language === "json" ? json() : yamlFrontmatter({ content: markdown() }),
					syntaxHighlighting(highlight),
					syntaxHighlighting(yamlHighlight),
					EditorView.lineWrapping,
					theme,
					EditorView.theme({ ".cm-gutters": { backgroundColor: "transparent", border: "none" } }),
					EditorView.contentAttributes.of({
						"aria-label": label,
						spellcheck: "false",
						...(id ? { id } : {}),
					}),
					keymap.of([...defaultKeymap, ...historyKeymap]),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) onChangeRef.current(update.state.doc.toString());
					}),
				],
			}),
		});
		view.current = editor;
		return () => {
			editor.destroy();
			view.current = null;
		};
	}, [id, label, language]);

	// External changes (switching tabs, reloads) flow back into the editor.
	useEffect(() => {
		const editor = view.current;
		if (editor && editor.state.doc.toString() !== value) {
			editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
		}
	}, [value]);

	return (
		<div
			ref={host}
			className={cn(
				"max-h-[75vh] min-h-96 overflow-y-auto rounded-md border bg-background font-mono focus-within:ring-[3px] focus-within:ring-ring/50",
				invalid && "border-destructive",
			)}
		/>
	);
}

/** Problems with a file, one per line: `key: message`. */
export function FileErrors({ errors }: { errors: Record<string, string[]> }) {
	const lines = Object.entries(errors).flatMap(([key, messages]) =>
		messages.map((m) => (key === "(file)" ? m : `${key}: ${m}`)),
	);
	if (!lines.length) return null;
	return (
		<ul
			role="alert"
			className="grid gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
		>
			{lines.map((line) => (
				<li key={line} className="font-mono text-xs">
					{line}
				</li>
			))}
		</ul>
	);
}
