"use client";

import Link from "next/link";
import { ChatIcon } from "./ContactIcons";
import styles from "./HeaderContact.module.css";
import useContactHidden from "./useContactHidden";

function Status({ text }: { text: string }) {
  return (
    <span className={styles.status}>
      <span className={styles.dot} aria-hidden="true" />
      {text}
    </span>
  );
}

// Shown while the URL is read on pages with dynamic params
export function HeaderContactFallback({
  availability,
}: {
  availability: string;
}) {
  return (
    <span className={styles.slot}>
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
    <span className={styles.slot} data-button={showButton}>
      <span className={styles.statusLayer} inert={showButton}>
        <Status text={availability} />
      </span>
      {/* Leads to the contact prompt in the footer, on any page */}
      <Link href="#contact" className={styles.cta} inert={!showButton}>
        <ChatIcon />
        Get in touch
      </Link>
    </span>
  );
}
