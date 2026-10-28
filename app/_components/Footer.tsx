import { cacheLife } from "next/cache";
import { getSocials } from "@/lib/api";
import SocialIcon from "./SocialIcon";
import styles from "./Footer.module.css";

// Cached so the page can still be prerendered; refreshed daily for the new year
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default async function Footer() {
  const socials = await getSocials();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copyright}>
          © <CurrentYear /> Ivan Vinski
        </p>
        <ul className={styles.socials}>
          {socials.map((social) => (
            <li key={social.name}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className={styles.social}
              >
                <SocialIcon name={social.name} />
              </a>
            </li>
          ))}
        </ul>
        {/* Browsers scroll to the top for #top when no element has that id */}
        <a href="#top" className={styles.top}>
          Back to top
        </a>
      </div>
    </footer>
  );
}
