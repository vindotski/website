"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./SectionMenu.module.css";

type MenuLink = { href: string; label: string };

// Pages under these paths belong to a home section
const owners: Record<string, string> = {
  work: "work",
  play: "work",
  blog: "blog",
};

function subscribe(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  window.addEventListener("resize", callback);
  return () => {
    window.removeEventListener("scroll", callback);
    window.removeEventListener("resize", callback);
  };
}

// The section under the header: the last one whose top has scrolled up to
// it and whose bottom hasn't. None on the hero or the footer
function sectionUnderHeader(ids: string[]) {
  const header = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--header-height",
    ),
  );
  let current: string | null = null;
  for (const id of ids) {
    const box = document.getElementById(id)?.getBoundingClientRect();
    if (box && box.top <= header + 1 && box.bottom > header + 1) current = id;
  }
  return current;
}

const idOf = (link: MenuLink) => link.href.replace("/#", "");

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={styles.chevron}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// The separator and section label, with the label and chevron centred on
// each other and on the name's baseline. Without a section (on the hero)
// there's nothing to show
function TriggerContent({ label }: { label: string | null }) {
  return (
    <>
      {label && (
        <span className={styles.separator} aria-hidden="true">
          /
        </span>
      )}
      {label && (
        <span className={styles.where}>
          {/* The key restarts the entry animation when the section changes */}
          <span key={label} className={styles.label}>
            {label}
          </span>
          <Chevron />
        </span>
      )}
    </>
  );
}

// The name, linking to the top of the home page. On project and blog pages
// phones shorten it to initials, to leave room for the page's name; the
// label keeps the full name for screen readers
function HomeName({
  short = false,
  onClick,
}: {
  short?: boolean;
  onClick?: React.MouseEventHandler;
}) {
  return (
    <Link
      href="/"
      className={styles.homeName}
      aria-label={short ? "Ivan Vinski" : undefined}
      onClick={onClick}
    >
      {short ? (
        <>
          <span className={styles.initials}>IV</span>
          <span className={styles.fullName}>Ivan Vinski</span>
        </>
      ) : (
        "Ivan Vinski"
      )}
    </Link>
  );
}

// Phones: two lines that turn into an X while the menu is open
function MenuIcon() {
  return (
    <>
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.line} aria-hidden="true" />
    </>
  );
}

// Shown while the URL is read on pages with dynamic params
export function SectionMenuFallback() {
  return (
    <>
      <HomeName />
      <span className={styles.trigger} aria-hidden="true">
        <TriggerContent label={null} />
      </span>
      <span className={styles.menuButton} aria-hidden="true">
        <MenuIcon />
      </span>
    </>
  );
}

// The name, which goes home, and where you are (the section on the home page
// as you scroll, the owning section on project and blog pages, or nothing on
// the hero), which opens the menu of sections, as does the menu icon
export default function SectionMenu({
  links,
  pageNames,
}: {
  links: MenuLink[];
  // Project and blog page names by path, for the last part of the trail
  pageNames: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // The button that opened the menu, to return focus to on Escape
  const openerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribe,
    () => sectionUnderHeader(links.map(idOf)),
    () => null,
  );
  const currentId =
    pathname === "/" ? scrolled : (owners[pathname.split("/")[1]] ?? null);
  const current = links.find((link) => idOf(link) === currentId);
  const pageName = pageNames[pathname];

  useEffect(() => {
    if (!open) return;

    // Start keyboard users in the menu
    firstLinkRef.current?.focus();

    // Phones: the menu fills the screen, so keep the page behind it still
    const { overflow } = document.body.style;
    if (window.matchMedia("(max-width: 639px)").matches) {
      document.body.style.overflow = "hidden";
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        openerRef.current?.focus();
      }
    }

    // A click anywhere else closes it
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function toggle(opener: HTMLButtonElement | null) {
    openerRef.current = opener;
    setOpen((value) => !value);
  }

  return (
    <>
      <HomeName
        short={Boolean(pageName)}
        onClick={(event) => {
          // Already home: just go back to the top
          if (pathname === "/") {
            event.preventDefault();
            window.scrollTo({ top: 0 });
          }
          setOpen(false);
        }}
      />
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        // Hidden when there's no section to show
        data-empty={!current}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => toggle(buttonRef.current)}
      >
        <TriggerContent label={current?.label ?? null} />
      </button>
      {pageName && (
        <span className={styles.page} aria-current="page">
          <span className={styles.separator} aria-hidden="true">
            /
          </span>
          <span className={styles.pageName}>{pageName}</span>
        </span>
      )}
      <button
        ref={menuButtonRef}
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => toggle(menuButtonRef.current)}
      >
        <MenuIcon />
      </button>

      {/* Stays in the page so it can animate; inert while closed */}
      <nav
        ref={panelRef}
        id={panelId}
        aria-label="Sections"
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
                aria-current={link === current ? "true" : undefined}
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
