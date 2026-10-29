import Link from "next/link";
import { getContact } from "@/lib/api";
import MobileMenu from "./MobileMenu";
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
  const contact = await getContact();
  const mailto = `mailto:${contact.email}`;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <MobileMenu links={links} />
        <Link href="/" className={styles.name}>
          Ivan Vinski
        </Link>
        <nav aria-label="Sections" className={styles.nav}>
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Leads to the contact prompt at the bottom of the home page */}
        <Link href="/#contact" className={styles.cta}>
          Get in touch
        </Link>
        <a href={mailto} className={styles.mail} aria-label="Email Ivan">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
          </svg>
        </a>
      </div>
    </header>
  );
}
