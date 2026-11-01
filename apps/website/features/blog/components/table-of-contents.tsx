import ScrollLink from "@/components/scroll-link";
import type { Section } from "@/lib/content/types";

// A post's ## headings, linking to the ids their headings get. Nothing
// when a post has no sections
export default function TableOfContents({ sections }: { sections: Section[] }) {
  if (sections.length === 0) return null;
  return (
    <nav
      className="flex max-w-[720px] flex-col gap-2 text-sm"
      aria-label="Contents"
    >
      <p className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Contents
      </p>
      <ol className="flex flex-col gap-1 pl-5">
        {sections.map((section) => (
          <li key={section.id}>
            <ScrollLink
              href={`#${section.id}`}
              className="underline-offset-4 hover:underline"
            >
              {section.title}
            </ScrollLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
