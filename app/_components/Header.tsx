import Link from "next/link";
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

export default function Header() {
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
          Get in touch
        </Link>
      </div>
    </header>
  );
}
