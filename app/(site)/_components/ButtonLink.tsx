import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import ScrollLink from "./ScrollLink";

// shadcn's Button look on a real link. The Button component itself always
// says role="button", which hides that it's a link, so shadcn recommends
// its classes on an <a> instead
type ButtonLinkProps = {
  href: string;
  // Primary is filled; secondary is outlined, for a second action. The
  // inverse pair is for dark bands; those carry the `dark` class, where the
  // normal pair already inverts
  variant?: "primary" | "secondary" | "inverse" | "inverseSecondary";
  // Shown before the text, or alone when there is no text
  icon?: React.ReactNode;
  // Accessible name for an icon-only button
  label?: string;
  newTab?: boolean;
  children?: React.ReactNode;
};

const variants = {
  primary: "default",
  secondary: "outline",
  inverse: "default",
  inverseSecondary: "outline",
} as const;

export default function ButtonLink({
  href,
  variant = "primary",
  icon,
  label,
  newTab = false,
  children,
}: ButtonLinkProps) {
  const className = buttonVariants({
    variant: variants[variant],
    size: children ? "lg" : "icon-lg",
  });
  const content = (
    <>
      {/* data-icon gives the icon side its tighter padding */}
      {icon && (
        <span data-icon="inline-start" className="contents">
          {icon}
        </span>
      )}
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
