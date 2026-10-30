import { Suspense } from "react";
import { getHero, getItems } from "@/lib/api";
import { CONTENT_TYPES, type ContentType } from "@/lib/content-types";
import HeaderContact, { HeaderContactFallback } from "./HeaderContact";
import Search from "./Search";
import SectionMenu, { SectionMenuFallback } from "./SectionMenu";
import styles from "./Header.module.css";

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
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* The name, the current section and the menu */}
        <div className={styles.brand}>
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
