"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// True while none of the elements marked data-hides-contact (the hero and
// the footer, which have their own contact buttons) is in view. False until
// the page has been checked, so nothing flashes on load
export default function useContactHidden() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  // Watch again on each page, since the marked elements change
  useEffect(() => {
    const showing = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) showing.add(entry.target);
        else showing.delete(entry.target);
      }
      setHidden(showing.size === 0);
    });
    document
      .querySelectorAll("[data-hides-contact]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  return hidden;
}
