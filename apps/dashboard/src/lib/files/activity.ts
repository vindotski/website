// Which place a path belongs to. Files shows the folder beside an open file on wide screens;
// Home and Settings use the whole area.

export type Activity = "files";

export function activityOf(pathname: string): Activity | null {
	return pathname === "/files" || pathname.startsWith("/files/") ? "files" : null;
}

/** The path a `/files/…` URL shows ("" for /files). */
export const pathOfFiles = (pathname: string) =>
	decodeURIComponent(pathname.replace(/^\/files\/?/, "").replace(/\/$/, ""));
