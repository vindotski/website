import { getContact, getHero, getSocials } from "@/lib/api";
import styles from "./page.module.css";

// Shown by the auth guard at / until launch. Indexable, so it has real text
// for search engines, not just a logo
export default async function TeaserPage() {
  const [hero, contact, socials] = await Promise.all([
    getHero(),
    getContact(),
    getSocials(),
  ]);
  const links = socials.filter((social) =>
    ["GitHub", "LinkedIn"].includes(social.name),
  );

  return (
    <main className={styles.teaser}>
      <p className={styles.eyebrow}>Coming soon</p>
      <h1 className={styles.name}>Ivan Vinski</h1>
      <p className={styles.headline}>{hero.headline}</p>
      <p className={styles.note}>Full site coming soon.</p>
      <nav className={styles.links} aria-label="Elsewhere">
        {links.map((social) => (
          <a key={social.name} href={social.href}>
            {social.name}
          </a>
        ))}
        <a href={`mailto:${contact.email}`}>Email</a>
      </nav>
    </main>
  );
}
