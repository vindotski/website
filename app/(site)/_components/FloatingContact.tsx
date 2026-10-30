"use client";

import ButtonLink from "./ButtonLink";
import { ChatIcon } from "./ContactIcons";
import useContactHidden from "./useContactHidden";

// Phones: Get in touch at the bottom of the screen while neither the hero
// nor the footer is in view, since the phone header has no contact link
export default function FloatingContact() {
  const visible = useContactHidden();

  // Fixed to the bottom of the screen, the width of the page column, above
  // the iPhone home indicator; slides down out of view while hidden. Tablets
  // and up have Get in touch in the header. A ring keeps the button apart
  // from black areas it passes over
  return (
    <div
      className="invisible fixed inset-x-gutter bottom-[calc(16px+env(safe-area-inset-bottom))] z-[9] translate-y-6 opacity-0 transition-[opacity,translate,visibility] duration-200 data-[visible=true]:visible data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 motion-reduce:transition-none sm:hidden *:w-full *:ring-1 *:ring-background"
      data-visible={visible}
      inert={!visible}
    >
      <ButtonLink href="#contact" icon={<ChatIcon />}>
        Get in touch
      </ButtonLink>
    </div>
  );
}
