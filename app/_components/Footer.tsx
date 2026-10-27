import { cacheLife } from "next/cache";
import Placeholder from "./Placeholder";
import styles from "./Footer.module.css";

// Cached so the page can still be prerendered; refreshed daily for the new year
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copyright}>
          © <CurrentYear /> Ivan Vinski
        </p>
        <div className={styles.links}>
          <Placeholder label="Social links" height={24} />
        </div>
        <a href="#top" className={styles.top}>
          Back to top
        </a>
      </div>
    </footer>
  );
}
