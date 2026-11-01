import { cn } from "@/lib/utils";

// Wraps a document's body: posts and project pages. The typography plugin
// styles the plain elements <Body> outputs. Headings stop below the sticky header when
// the table of contents jumps to them; images are spaced like paragraphs.
// The backticks rule is the plugin's documented opt-out
export default function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-[720px]",
        "prose-headings:scroll-mt-[calc(var(--top-chrome)+16px)]",
        "*:[.not-prose]:my-6",
        // The plugin wraps inline code in literal backticks
        "prose-code:before:content-none prose-code:after:content-none",
      )}
    >
      {children}
    </div>
  );
}
