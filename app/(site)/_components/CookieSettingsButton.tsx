"use client";

import { openCookieSettings } from "@/app/_components/ConsentBanner";

// In the footer: brings the consent banner back to change the choice
export default function CookieSettingsButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button type="button" className={className} onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}
