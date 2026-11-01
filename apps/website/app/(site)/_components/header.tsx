import { Suspense } from "react";
import ButtonLink from "@/components/button-link";
import { ChatIcon } from "@/components/contact-icons";
import MobileNav from "./mobile-nav";
import NavLinks, { NavLinksFallback } from "./nav-links";
import ScrollLink from "@/components/scroll-link";
import SearchDialog from "@/features/search/components/search-dialog";

// The name, the section links, search and Get in touch. Below md the links
// and Get in touch move into a sheet behind ☰
export default function Header() {
  return (
    <header className="sticky top-(--admin-bar-height) z-10 border-b bg-background">
      <div className="mx-auto flex h-[calc(var(--header-height)-1px)] max-w-content items-center gap-4 px-gutter">
        <ScrollLink href="/" className="flex-none font-semibold">
          Ivan Vinski
        </ScrollLink>
        <nav aria-label="Sections" className="hidden md:block">
          {/* Reads the URL, which waits on pages with dynamic params; the
              rest of the header stays prerendered */}
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchDialog />
          <span className="hidden md:block">
            {/* Leads to the contact prompt in the footer, on any page */}
            <ButtonLink href="#contact" icon={<ChatIcon />} track={{ event: "contact_click", method: "contact_open", location: "header" }}>
              Get in touch
            </ButtonLink>
          </span>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
