import { Suspense } from "react";
import { getHero, getItems } from "@/lib/api";
import { CONTENT_TYPES, type ContentType } from "@/lib/content-types";
import HeaderContact, { HeaderContactFallback } from "./HeaderContact";
import Search from "./Search";
import SectionMenu, { SectionMenuFallback } from "./SectionMenu";

// Paths include "/" so the links also work from project pages
const links = [
  { href: "/#work", label: "Work" },
  { href: "/#services", label: "Services" },
  { href: "/#experience", label: "Experience" },
  { href: "/#process", label: "Process" },
  { href: "/#blog", label: "Blog" },
];

export default async function Header() {
  const types = Object.keys(CONTENT_TYPES) as ContentType[];
  const [hero, ...lists] = await Promise.all([
    getHero(),
    ...types.map((type) => getItems(type)),
  ]);
  // Names for the header trail on project and blog pages
  const pageNames = Object.fromEntries(
    lists.flatMap((items, index) =>
      items.map((item) => [
        `${CONTENT_TYPES[types[index]].route}/${item.slug}`,
        item.title,
      ]),
    ),
  );

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      {/* The name with the section menu, search, and the contact button. The
          first column may shrink below its content, so a long page name
          ends in an ellipsis instead of running under search */}
      <div className="mx-auto grid h-[calc(var(--header-height)-1px)] max-w-content grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 px-gutter">
        {/* The name, the current section and the menu */}
        {/* Phones: full width, so the menu icon can sit at the right; tablets
            and up: only as wide as its content, up to the column */}
        <div className="flex max-w-full min-w-0 items-center gap-2 justify-self-stretch sm:justify-self-start">
          {/* Reads the URL, which waits on pages with dynamic params; the
              rest of the header stays prerendered */}
          <Suspense fallback={<SectionMenuFallback />}>
            <SectionMenu links={links} pageNames={pageNames} />
          </Suspense>
        </div>
        <Search />
        {/* Availability or Get in touch, depending on what's in view; reads
            the URL, like the menu */}
        <Suspense
          fallback={<HeaderContactFallback availability={hero.availability} />}
        >
          <HeaderContact availability={hero.availability} />
        </Suspense>
      </div>
    </header>
  );
}
