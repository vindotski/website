import Link from "next/link";
import styles from "./ButtonLink.module.css";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
};

export default function ButtonLink({ href, children }: ButtonLinkProps) {
  // Links that leave the site (mailto:, https:) don't go through the router
  if (/^[a-z]+:/i.test(href)) {
    return (
      <a href={href} className={styles.button}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={styles.button}>
      {children}
    </Link>
  );
}
