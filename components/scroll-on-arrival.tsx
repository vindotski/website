"use client";

import { useEffect } from "react";
import { SCROLL_TARGET_KEY } from "./scroll-link";

// On the home page: lands on the section a link from another page asked
// for, or on the #hash the page was opened with (redirects, old links), and
// then takes the hash out of the address bar
export default function ScrollOnArrival() {
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_TARGET_KEY);
    sessionStorage.removeItem(SCROLL_TARGET_KEY);
    const id = saved ?? window.location.hash.slice(1);
    if (!id) return;

    document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
    if (window.location.hash) {
      // Keeps the router's own history state
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  return null;
}
