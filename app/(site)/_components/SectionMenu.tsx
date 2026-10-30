"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ScrollLink from "./ScrollLink";

type MenuLink = { href: string; label: string };

// The name and the section, one button on one baseline. Padding with a
// negative margin gives a taller tap area without pushing the header. One
// weight for both, so only the colour tells them apart
const triggerClass =
  "group/trigger -my-3 inline-flex flex-none items-baseline gap-2 py-3 text-left font-semibold data-[empty=true]:hidden";

// Phones: a 44px target at the right; tablets and up: before the name, lined
// up with the page edge
const menuButtonClass =
  "group/menu -my-3 -mr-3 ml-auto flex size-11 flex-col items-center justify-center gap-1.5 sm:order-first sm:mr-0 sm:-ml-3";

// Between the name and the section, like a path
const separatorClass = "font-normal text-muted-foreground";

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
      className="size-4 transition-[rotate] duration-200 group-aria-expanded/trigger:rotate-180 motion-reduce:transition-none"
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
        <span className={separatorClass} aria-hidden="true">
          /
        </span>
      )}
      {label && (
        <span className="inline-flex items-center gap-1 text-muted-foreground group-hover/trigger:text-foreground group-aria-expanded/trigger:text-foreground">
          {/* The key restarts the entry animation when the section changes */}
          <span key={label} className="motion-safe:animate-label-in">
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
    <ScrollLink
      href="/"
      className="flex-none font-semibold"
      aria-label={short ? "Ivan Vinski" : undefined}
      onClick={onClick}
    >
      {short ? (
        <>
          <span className="sm:hidden">IV</span>
          <span className="hidden sm:inline">Ivan Vinski</span>
        </>
      ) : (
        "Ivan Vinski"
      )}
    </ScrollLink>
  );
}

// Phones: two lines that turn into an X while the menu is open
const lineClass =
  "h-[1.5px] w-[18px] bg-current transition-transform duration-300 group-aria-expanded/menu:first:translate-y-[3.75px] group-aria-expanded/menu:first:rotate-45 group-aria-expanded/menu:last:-translate-y-[3.75px] group-aria-expanded/menu:last:-rotate-45 motion-reduce:transition-none";

function MenuIcon() {
  return (
    <>
      <span className={lineClass} aria-hidden="true" />
      <span className={lineClass} aria-hidden="true" />
    </>
  );
}

// Shown while the URL is read on pages with dynamic params
export function SectionMenuFallback() {
  return (
    <>
      <HomeName />
      <span className={triggerClass} aria-hidden="true">
        <TriggerContent label={null} />
      </span>
      <span className={menuButtonClass} aria-hidden="true">
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
        onClick={() => setOpen(false)}
      />
      <button
        ref={buttonRef}
        type="button"
        className={triggerClass}
        // Hidden when there's no section to show
        data-empty={!current}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => toggle(buttonRef.current)}
      >
        <TriggerContent label={current?.label ?? null} />
      </button>
      {pageName && (
        <span className="flex min-w-0 gap-2 whitespace-nowrap" aria-current="page">
          <span className={separatorClass} aria-hidden="true">
            /
          </span>
          <span className="truncate font-semibold">{pageName}</span>
        </span>
      )}
      <button
        ref={menuButtonRef}
        type="button"
        className={menuButtonClass}
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
        // Positioned from the sticky header, so it sits right under it. Phones:
        // fills the screen below the header; tablets and up: as tall as the
        // links, and the page stays scrollable. Visibility only waits for
        // the fade when closing: opening makes it visible at once, so the
        // first link can take focus straight away
        className="group/panel invisible absolute inset-x-0 top-full h-[calc(100svh-var(--header-height))] overflow-y-auto bg-background py-6 opacity-0 transition-[opacity,visibility] duration-300 data-[open=true]:visible data-[open=true]:opacity-100 data-[open=true]:transition-opacity motion-reduce:transition-none sm:h-auto sm:border-b"
        data-open={open}
        inert={!open}
      >
        <ul className="mx-auto max-w-content px-gutter">
          {links.map((link, index) => (
            <li
              key={link.href}
              // Each link fades in a little after the one above it
              style={{ "--i": index } as React.CSSProperties}
              className="-translate-y-2 opacity-0 transition-[opacity,translate] duration-300 group-data-[open=true]/panel:translate-y-0 group-data-[open=true]/panel:opacity-100 group-data-[open=true]/panel:delay-[calc(var(--i)*40ms+60ms)] motion-reduce:transition-none"
            >
              <ScrollLink
                href={link.href}
                ref={index === 0 ? firstLinkRef : undefined}
                className="block py-2 text-2xl font-semibold tracking-tight text-muted-foreground hover:text-foreground aria-[current=true]:text-foreground"
                aria-current={link === current ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </ScrollLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
