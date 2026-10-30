"use client";

import ButtonLink from "./ButtonLink";
import { ChatIcon } from "./ContactIcons";
import styles from "./FloatingContact.module.css";
import useContactHidden from "./useContactHidden";

// Phones: Get in touch at the bottom of the screen while neither the hero
// nor the footer is in view, since the phone header has no contact link
export default function FloatingContact() {
  const visible = useContactHidden();

  return (
    <div className={styles.bar} data-visible={visible} inert={!visible}>
      <ButtonLink href="#contact" icon={<ChatIcon />}>
        Get in touch
      </ButtonLink>
    </div>
  );
}
