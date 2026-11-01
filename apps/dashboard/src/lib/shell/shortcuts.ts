// Keyboard shortcuts: "mod" is ⌘ on Apple platforms and Ctrl elsewhere.

export type Shortcut = "mod+s" | "mod+b" | "mod+/" | "mod+shift+i";

type KeyEventLike = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">;

export function matchShortcut(event: KeyEventLike, apple: boolean): Shortcut | null {
	const mod = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
	if (!mod || event.altKey) return null;
	const key = event.key.toLowerCase();
	if (event.shiftKey) return key === "i" ? "mod+shift+i" : null;
	if (key === "s" || key === "b" || key === "/") return `mod+${key}` as Shortcut;
	return null;
}

/** "⌘S" on Apple platforms, "Ctrl+S" elsewhere. */
export function shortcutLabel(shortcut: Shortcut, apple: boolean) {
	const keys = shortcut
		.split("+")
		.slice(1)
		.map((k) => (k === "shift" ? (apple ? "⇧" : "Shift") : k.toUpperCase()));
	return apple ? `⌘${keys.join("")}` : `Ctrl+${keys.join("+")}`;
}

export const isApple = () =>
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
