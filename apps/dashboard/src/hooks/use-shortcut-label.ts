import { useSyncExternalStore } from "react";
import { isApple, type Shortcut, shortcutLabel } from "#/lib/shell/shortcuts";

const noSubscription = () => () => {};

/**
 * Labels shortcuts for this platform ("⌘S" on Apple, "Ctrl+S" elsewhere). The server can't know
 * the platform, so the first render matches it (Ctrl) and the label switches right after
 * hydration, without a mismatch.
 */
export function useShortcutLabel() {
	const apple = useSyncExternalStore(noSubscription, isApple, () => false);
	return (shortcut: Shortcut) => shortcutLabel(shortcut, apple);
}
