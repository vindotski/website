"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./MobileMenu.module.css";

type MobileMenuProps = {
  links: { href: string; label: string }[];
};

// Phones only: the menu button and the full-screen panel it opens
export default function MobileMenu({ links }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;

    // Keep the page behind the menu still, and start keyboard users in the menu
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    // The menu doesn't exist on wide screens, so close it if the window grows
    const wide = window.matchMedia("(min-width: 900px)");
    function onWide(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.line} aria-hidden="true" />
        <span className={styles.line} aria-hidden="true" />
      </button>

      {/* Stays in the page so it can animate; inert while closed */}
      <nav
        id={panelId}
        aria-label="Menu"
        className={styles.panel}
        data-open={open}
        inert={!open}
      >
        <ul className={styles.links}>
          {links.map((link, index) => (
            <li
              key={link.href}
              // Each link fades in a little after the one above it
              style={{ "--i": index } as React.CSSProperties}
            >
              <Link
                href={link.href}
                ref={index === 0 ? firstLinkRef : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
