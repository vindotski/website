"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import ScrollLink from "@/components/scroll-link";

type NavLink = { href: string; label: string };

// Paths include "/" so the links also work from project and blog pages
export const navLinks: NavLink[] = [
  { href: "/#work", label: "Work" },
  { href: "/#services", label: "Services" },
  { href: "/#experience", label: "Experience" },
  { href: "/#process", label: "Process" },
  { href: "/#blog", label: "Blog" },
];

// Pages under these paths belong to a home section
const owners: Record<string, string> = {
  work: "work",
  play: "work",
  blog: "blog",
};

const idOf = (link: NavLink) => link.href.replace("/#", "");

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
function sectionUnderHeader() {
  const header = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--header-height",
    ),
  );
  let current: string | null = null;
  for (const id of navLinks.map(idOf)) {
    const box = document.getElementById(id)?.getBoundingClientRect();
    if (box && box.top <= header + 1 && box.bottom > header + 1) current = id;
  }
  return current;
}

// The current section's id: the one scrolled to on the home page, or the
// one that owns a project or blog page
function useCurrentSection() {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(subscribe, sectionUnderHeader, () => null);
  return pathname === "/" ? scrolled : (owners[pathname.split("/")[1]] ?? null);
}

type Orientation = "row" | "column";

function Links({
  current,
  orientation,
  onNavigate,
}: {
  current: string | null;
  orientation: Orientation;
  onNavigate?: () => void;
}) {
  return (
    <ul
      className={cn(
        "flex",
        orientation === "row" ? "items-center gap-1" : "flex-col gap-1",
      )}
    >
      {navLinks.map((link) => (
        <li key={link.href}>
          <ScrollLink
            href={link.href}
            aria-current={idOf(link) === current ? "true" : undefined}
            onClick={onNavigate}
            // Current: the foreground colour and an underline, so it isn't
            // told by colour alone
            className={cn(
              "block font-medium text-muted-foreground underline-offset-[6px] hover:text-foreground aria-[current=true]:text-foreground aria-[current=true]:underline",
              orientation === "row" ? "px-2 py-1 text-sm" : "py-2 text-lg",
            )}
          >
            {link.label}
          </ScrollLink>
        </li>
      ))}
    </ul>
  );
}

// Shown while the URL is read on pages with dynamic params: the same links,
// none marked yet
export function NavLinksFallback({
  orientation = "row",
}: {
  orientation?: Orientation;
}) {
  return <Links current={null} orientation={orientation} />;
}

// The section links, in the bar (a row) or the phone sheet (a column), with
// the current one marked
export default function NavLinks({
  orientation = "row",
  onNavigate,
}: {
  orientation?: Orientation;
  onNavigate?: () => void;
}) {
  return (
    <Links
      current={useCurrentSection()}
      orientation={orientation}
      onNavigate={onNavigate}
    />
  );
}
