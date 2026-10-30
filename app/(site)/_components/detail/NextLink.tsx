import Link from "next/link";
import styles from "./NextLink.module.css";

type NextLinkProps = {
  href: string;
  name: string;
};

export default function NextLink({ href, name }: NextLinkProps) {
  return (
    <nav className={styles.next} aria-label="Next">
      <Link href={href} className={styles.link}>
        <span className={styles.label}>Next</span>
        <span className={styles.name}>{name} →</span>
      </Link>
    </nav>
  );
}
