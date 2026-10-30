import Link from "next/link";
import ScrollLink from "./ScrollLink";
import styles from "./ButtonLink.module.css";

type ButtonLinkProps = {
  href: string;
  // Primary is filled; secondary is outlined, for a second action;
  // inverse and inverseSecondary are the same pair for dark backgrounds
  variant?: "primary" | "secondary" | "inverse" | "inverseSecondary";
  // Shown before the text, or alone when there is no text
  icon?: React.ReactNode;
  // Accessible name for an icon-only button
  label?: string;
  newTab?: boolean;
  children?: React.ReactNode;
};

export default function ButtonLink({
  href,
  variant = "primary",
  icon,
  label,
  newTab = false,
  children,
}: ButtonLinkProps) {
  const className = [
    styles.button,
    styles[variant],
    children ? null : styles.iconOnly,
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {icon}
      {children}
    </>
  );

  // Links to a section or something on the page scroll there, without a
  // #hash in the address bar
  if (href.startsWith("#") || href.startsWith("/#")) {
    return (
      <ScrollLink href={href} className={className} aria-label={label}>
        {content}
      </ScrollLink>
    );
  }

  // Links that leave the site (mailto:, https:) don't go through the router
  if (/^[a-z]+:/i.test(href)) {
    return (
      <a
        href={href}
        className={className}
        aria-label={label}
        {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label}>
      {content}
    </Link>
  );
}
