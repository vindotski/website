"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_KEY } from "@/lib/analytics";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Fired to show the banner again, e.g. from the footer's Cookie settings
const REOPEN_EVENT = "analytics:consent";

function readChoice() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    // Storage blocked: ask every visit, and keep the default (denied)
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(REOPEN_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REOPEN_EVENT, callback);
  };
}

// Clears the stored choice and shows the banner, so consent can be taken
// back as easily as it was given
export function openCookieSettings() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {}
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

function choose(choice: "granted" | "denied") {
  sendGAEvent("consent", "update", { analytics_storage: choice });
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {}
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

// Asks once, at the bottom of the screen: the full width of the page column
// on phones, a small card at the right from sm. Hidden on the server, so the
// page never flashes it for visitors who already chose
export default function ConsentBanner() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "server");
  if (choice !== null) return null;

  return (
    <Card
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-gutter bottom-4 z-50 sm:left-auto sm:w-sm"
    >
      <CardHeader>
        <CardTitle>Analytics cookies</CardTitle>
        <CardDescription>
          They help me see which work gets read. Nothing is stored unless you
          accept.
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button onClick={() => choose("granted")}>Accept</Button>
        <Button variant="outline" onClick={() => choose("denied")}>
          Decline
        </Button>
      </CardFooter>
    </Card>
  );
}
