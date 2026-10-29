import Link from "next/link";
import { Suspense } from "react";
import { getPosts, getSamples, getWork } from "@/lib/api";
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
  const [work, samples, posts] = await Promise.all([
    getWork(),
    getSamples(),
    getPosts(),
  ]);
  // Names for the header trail on project and blog pages
  const pageNames = Object.fromEntries([
    ...work.map((item) => [`/work/${item.slug}`, item.name]),
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
        {/* Leads to the contact prompt in the footer, on any page */}
        <Link href="#contact" className={styles.cta}>
          {/* Speech bubble: talk, by call or email */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M3 4h18v13H10l-5 4v-4H3z" />
          </svg>
          <span className={styles.ctaText}>Get in touch</span>
        </Link>
      </div>
    </header>
  );
}
