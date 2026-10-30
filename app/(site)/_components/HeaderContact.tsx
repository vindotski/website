"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatIcon } from "./ContactIcons";
import ScrollLink from "./ScrollLink";
import useContactHidden from "./useContactHidden";

function Status({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
      <span className="size-2 bg-foreground" aria-hidden="true" />
      {text}
    </span>
  );
}

// Tablets and up only. Both states share one cell, right-aligned
const slotClass = "group/slot hidden justify-self-end sm:grid";
const layerClass =
  "[grid-area:1/1] self-center justify-self-end transition-[opacity,visibility] duration-200 motion-reduce:transition-none";

// Shown while the URL is read on pages with dynamic params
export function HeaderContactFallback({
  availability,
}: {
  availability: string;
}) {
  return (
    <span className={slotClass}>
      <Status text={availability} />
    </span>
  );
}

// Tablets and up: Get in touch while the hero and footer (which have their
// own contact buttons) are out of view; the availability status (the
// hero's line) while either is showing. The two fade into each other in the
// same spot
export default function HeaderContact({
  availability,
}: {
  availability: string;
}) {
  const showButton = useContactHidden();

  return (
    <span className={slotClass} data-button={showButton}>
      <span
        className={cn(
          layerClass,
          "group-data-[button=true]/slot:invisible group-data-[button=true]/slot:opacity-0",
        )}
        inert={showButton}
      >
        <Status text={availability} />
      </span>
      {/* Leads to the contact prompt in the footer, on any page */}
      <ScrollLink
        href="#contact"
        className={cn(
          buttonVariants(),
          layerClass,
          "group-data-[button=false]/slot:invisible group-data-[button=false]/slot:opacity-0",
        )}
        inert={!showButton}
      >
        <span data-icon="inline-start" className="contents">
          <ChatIcon />
        </span>
        Get in touch
      </ScrollLink>
    </span>
  );
}
