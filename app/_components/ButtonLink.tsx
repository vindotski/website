import Link from "next/link";
import styles from "./ButtonLink.module.css";

type ButtonLinkProps = {
  href: string;
  // Primary is the filled pill; secondary is outlined, for a second action;
  // inverse is the filled pill for dark backgrounds
  variant?: "primary" | "secondary" | "inverse";
  children: React.ReactNode;
};

export default function ButtonLink({
  href,
  variant = "primary",
  children,
}: ButtonLinkProps) {
  const className = `${styles.button} ${styles[variant]}`;

  // Links that leave the site (mailto:, https:) don't go through the router
  if (/^[a-z]+:/i.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
