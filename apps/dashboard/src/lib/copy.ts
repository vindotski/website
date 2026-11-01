import { toast } from "sonner";

// Copying to the clipboard, with a toast either way: it needs a secure context (HTTPS or
// localhost) and the browser's permission.

/** Copies `text`, then says "Copied <what>" (or that it couldn't). */
export function copyText(text: string, what: string) {
	const failed = () => toast.error(`Couldn't copy ${what}`);
	if (!navigator.clipboard) return failed();
	navigator.clipboard.writeText(text).then(() => toast.success(`Copied ${what}`), failed);
}
