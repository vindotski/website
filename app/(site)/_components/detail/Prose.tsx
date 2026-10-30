import { cn } from "@/lib/utils";

// Wraps an MDX body: posts, work and play pages. The typography plugin styles
// the plain elements MDX outputs. Headings stop below the sticky header when
// the table of contents jumps to them; images are spaced like paragraphs.
// The backticks rule is the plugin's documented opt-out
export default function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-[720px]",
        "prose-headings:scroll-mt-[calc(var(--header-height)+16px)]",
        "*:[.not-prose]:my-6",
        // The plugin wraps inline code in literal backticks
        "prose-code:before:content-none prose-code:after:content-none",
      )}
    >
      {children}
    </div>
  );
}
