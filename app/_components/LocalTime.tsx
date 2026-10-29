"use client";

import { useSyncExternalStore } from "react";

// Calls back at the start of every minute
function subscribe(callback: () => void) {
  let interval: ReturnType<typeof setInterval> | undefined;
  const timeout = setTimeout(() => {
    callback();
    interval = setInterval(callback, 60_000);
  }, 60_000 - (Date.now() % 60_000));
  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };
}

// The current time there, e.g. " (14:32 CET)", CEST in summer. Shows
// nothing on the server and first paint, so the prebuilt page never carries
// a stale build-time clock
export default function LocalTime({ timeZone }: { timeZone: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () => format(timeZone),
    () => null,
  );

  if (!time) return null;
  return <> ({time})</>;
}

function format(timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date());
}
