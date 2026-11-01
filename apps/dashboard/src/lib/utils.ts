import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Two letters for an avatar, from an email. */
export const initials = (email: string | null) => (email ?? "?").slice(0, 2).toUpperCase();
