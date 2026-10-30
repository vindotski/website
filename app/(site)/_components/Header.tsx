import { Suspense } from "react";
import { getHero, getPosts, getSamples, getWork } from "@/lib/api";
import HeaderContact, { HeaderContactFallback } from "./HeaderContact";
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
  const [hero, work, samples, posts] = await Promise.all([
    getHero(),
    getWork(),
    getSamples(),
    getPosts(),
  ]);
  // Names for the header trail on project and blog pages
  const pageNames = Object.fromEntries([
    ...work.map((item) => [`/work/${item.slug}`, item.title]),
    ...samples.map((item) => [`/play/${item.slug}`, item.name]),
    ...posts.map((post) => [`/blog/${post.slug}`, post.title]),
  ]);

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
