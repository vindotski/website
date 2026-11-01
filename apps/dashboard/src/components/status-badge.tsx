import { useHydrated } from "@tanstack/react-router";

// Dates in the dashboard. The server can't know your time zone, so it renders UTC and the browser
// switches to yours once hydrated: the same text on both sides, then yours.

const options = { dateStyle: "medium", timeStyle: "short" } as const;
const local = new Intl.DateTimeFormat("en-US", options);
const utc = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });

/** A date and time (`Oct 24, 2026, 9:00 AM`), or "—" without one. */
export function DateTime({ value }: { value: string | null }) {
	const hydrated = useHydrated();
	if (!value) return <>—</>;
	const date = new Date(value);
	return <time dateTime={value}>{hydrated ? local.format(date) : `${utc.format(date)} UTC`}</time>;
}
