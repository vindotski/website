import type { AnyFieldApi } from "@tanstack/react-form";
import { type ComponentProps, type ReactNode, useId } from "react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { messagesOf } from "#/lib/form";

// Form fields bound to TanStack Form: a label, the input, optional help, and the first error.

type InputProps = Omit<ComponentProps<"input">, "id" | "name" | "value" | "onChange" | "onBlur">;

export function TextField({
	field,
	label,
	help,
	labelAside,
	markRequired,
	...input
}: {
	field: AnyFieldApi;
	label: string;
	help?: ReactNode;
	/** Something beside the label, like a "Forgot password?" link. */
	labelAside?: ReactNode;
	/** Show a "*" after the label (and set aria-required). */
	markRequired?: boolean;
} & InputProps) {
	const id = useId();
	const errors = messagesOf(field.state.meta.errors);
	const helpId = `${id}-help`;
	const errorId = `${id}-error`;
	const describedBy = [help && helpId, errors.length && errorId].filter(Boolean).join(" ");

	return (
		<div className="grid gap-2">
			{labelAside ? (
				<div className="flex items-center justify-between">
					<FieldLabel id={id} label={label} markRequired={markRequired} />
					{labelAside}
				</div>
			) : (
				<FieldLabel id={id} label={label} markRequired={markRequired} />
			)}
			<Input
				id={id}
				name={field.name}
				value={field.state.value ?? ""}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={field.handleBlur}
				aria-invalid={errors.length ? true : undefined}
				aria-describedby={describedBy || undefined}
				aria-required={markRequired || undefined}
				{...input}
			/>
			{help && (
				<p id={helpId} className="text-xs text-muted-foreground">
					{help}
				</p>
			)}
			{errors.length ? (
				<p id={errorId} className="text-sm text-destructive">
					{errors[0]}
				</p>
			) : null}
		</div>
	);
}

/** The form-wide message (e.g. "Something went wrong"), announced to screen readers. */
/**
 * A form's submit error, as a message: its validators return `{ form: message }`, which
 * TanStack Form keeps as given in `errorMap.onSubmit`.
 */
export function formError(error: unknown): string | undefined {
	if (typeof error === "string") return error;
	const form = (error as { form?: unknown } | null | undefined)?.form;
	return typeof form === "string" ? form : undefined;
}

export function FormMessage({ errors }: { errors: readonly unknown[] }) {
	const [message] = messagesOf(errors);
	return (
		<p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
			{message}
		</p>
	);
}

function FieldLabel({
	id,
	label,
	markRequired,
}: {
	id: string;
	label: string;
	markRequired?: boolean;
}) {
	return (
		<Label htmlFor={id}>
			{label}
			{markRequired && (
				<span className="text-destructive" aria-hidden="true">
					*
				</span>
			)}
		</Label>
	);
}
