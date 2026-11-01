import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { describeBodyProblem, markdownToTree } from "#/lib/content/body";
import { IMAGE_SLUG } from "#/lib/content/fields";
import { cn } from "#/lib/utils";

// The Source editor's look, and a react-markdown preview of a body (raw HTML is refused when the
// body is checked, and never rendered).

/** Editor look shared with the Source editor (app CSS variables, light and dark). */
export const theme = EditorView.theme({
	"&": {
		fontSize: "14px",
		backgroundColor: "transparent",
		color: "var(--foreground)",
	},
	".cm-content": {
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
		padding: "12px 0",
		caretColor: "var(--foreground)",
	},
	".cm-line": { padding: "0 12px" },
	"&.cm-focused": { outline: "none" },
	".cm-cursor": { borderLeftColor: "var(--foreground)" },
	".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
		backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent) !important",
	},
	".cm-placeholder": { color: "var(--muted-foreground)" },
});

export const highlight = HighlightStyle.define([
	{ tag: t.heading, fontWeight: "700" },
	{ tag: t.strong, fontWeight: "700" },
	{ tag: t.emphasis, fontStyle: "italic" },
	{ tag: t.link, color: "var(--primary)", textDecoration: "underline" },
	{ tag: t.url, color: "var(--muted-foreground)" },
	{ tag: [t.monospace, t.quote], color: "var(--muted-foreground)" },
	{ tag: [t.processingInstruction, t.contentSeparator], color: "var(--muted-foreground)" },
]);

export function MarkdownPreview({
	source,
	body,
	imagesAt,
	imageVersions,
	className,
}: {
	source: string;
	/** A document's body: checked the way it's stored (no raw HTML). */
	body?: boolean;
	/** Where the document's own images (`![](cover.png)`) are served: /<site>/media/<path>. */
	imagesAt?: string;
	/** Each image's hash by name, added as `?v=` so a replaced image isn't shown stale. */
	imageVersions?: ReadonlyMap<string, string>;
	className?: string;
}) {
	const urlTransform = (url: string, key: string) => {
		if (key !== "src" || !imagesAt || !IMAGE_SLUG.test(url)) return defaultUrlTransform(url);
		const v = imageVersions?.get(url);
		return v ? `${imagesAt}/${url}?v=${v}` : `${imagesAt}/${url}`;
	};
	const parsed = body && source.trim() ? markdownToTree(source) : null;
	const problem = parsed && !parsed.ok ? parsed.problem : null;
	return (
		<div
			className={cn(
				"text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-md [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-6",
				className,
			)}
		>
			{problem ? (
				<p className="text-destructive">{describeBodyProblem(problem)}</p>
			) : source.trim() ? (
				<ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform}>
					{source}
				</ReactMarkdown>
			) : (
				<p className="text-muted-foreground">Nothing to preview yet.</p>
			)}
		</div>
	);
}
