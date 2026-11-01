import { type RefObject, useState } from "react";
import { DateTime } from "#/components/status-badge";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

// Pieces shared by the document and config editors.

export type Conflict = { updatedAt: string; updatedBy?: string | null };

/** Someone saved first: what happened, and a way to get their version. */
export function ConflictNotice({
	conflict,
	noticeRef,
	onReload,
}: {
	conflict: Conflict;
	noticeRef: RefObject<HTMLDivElement | null>;
	onReload: () => void;
}) {
	return (
		<div
			ref={noticeRef}
			role="alert"
			className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
		>
			<p className="font-medium">This file changed while you were editing.</p>
			<p className="mt-1 text-muted-foreground">
				{conflict.updatedBy ?? "Someone"} saved it <DateTime value={conflict.updatedAt} />. Saving
				now would overwrite their changes, so it was blocked. Copy anything you need, then reload to
				see the latest version.
			</p>
			<Button type="button" variant="outline" size="sm" className="mt-3" onClick={onReload}>
				Reload latest version
			</Button>
		</div>
	);
}

/** Asked when leaving with unsaved text (see useBlocker). */
export function LeaveDialog({
	open,
	onStay,
	onLeave,
}: {
	open: boolean;
	onStay: () => void;
	onLeave: () => void;
}) {
	return (
		<AlertDialog open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Leave without saving?</AlertDialogTitle>
					<AlertDialogDescription>Your unsaved changes will be lost.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onStay}>Keep editing</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onLeave}>
						Leave
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** Asks for a name before a new file opens, like a file manager. */
export function NameDialog({
	title,
	description,
	label,
	prefix,
	suffix,
	check,
	onSubmit,
	onCancel,
}: {
	title: string;
	description: string;
	label: string;
	/** Shown before the input, e.g. `posts/`. */
	prefix?: string;
	/** Shown after it, e.g. `/index.md`. */
	suffix?: string;
	/** A problem with the name, or null when it's usable. */
	check: (name: string) => string | null;
	onSubmit: (name: string) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState("");
	const problem = name ? check(name) : null;
	return (
		<Dialog open onOpenChange={(open) => !open && onCancel()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<form
					className="grid gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (name && !problem) onSubmit(name);
					}}
				>
					<Label htmlFor="new-name">{label}</Label>
					<div className="flex items-center gap-1 font-mono text-sm">
						{prefix && <span className="text-muted-foreground">{prefix}</span>}
						<Input
							id="new-name"
							value={name}
							onChange={(e) => setName(e.target.value.trim())}
							aria-invalid={problem ? true : undefined}
							autoFocus
							className="font-mono"
						/>
						{suffix && <span className="text-muted-foreground">{suffix}</span>}
					</div>
					{problem && <p className="text-sm text-destructive">{problem}</p>}
					<DialogFooter className="mt-2">
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name || !!problem}>
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
