import styles from "./Header.module.css";

const links = [
  { href: "#work", label: "Work" },
  { href: "#what-i-do", label: "What I do" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.name}>
          Ivan Vinski
        </a>
        <nav aria-label="Sections">
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
