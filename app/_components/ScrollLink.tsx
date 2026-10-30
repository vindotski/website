"use client";

import { useRouter } from "next/navigation";

// Where a section link was headed, for the home page to scroll to on arrival
export const SCROLL_TARGET_KEY = "scroll-target";

type ScrollLinkProps = Omit<React.ComponentProps<"a">, "href"> & {
  // "/" for the top of the home page, "/#id" for a home section, "#id" for
  // something on the current page, "#top" for the top of the current page
  href: string;
};

// A link that scrolls instead of jumping, and never puts a #hash in the
// address bar. Each link does the same thing from any page: a home section
// link scrolls there on the home page and goes home and lands there from
// anywhere else. The href stays real, so opening it in a new tab still works
export default function ScrollLink({ href, onClick, ...props }: ScrollLinkProps) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    // Leave new-tab and new-window clicks to the browser
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();

    const onHome = window.location.pathname === "/";
    const id = href.split("#")[1];

    if (href === "/") {
      if (onHome) window.scrollTo({ top: 0 });
      else router.push("/");
      return;
    }
    if (id === "top") {
      window.scrollTo({ top: 0 });
      return;
    }

    const target = id && document.getElementById(id);
    if (target) {
      target.scrollIntoView();
    } else if (href.startsWith("/#")) {
      // On another page: go home, which scrolls to the section on arrival
      sessionStorage.setItem(SCROLL_TARGET_KEY, id);
      router.push("/", { scroll: false });
    }
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
