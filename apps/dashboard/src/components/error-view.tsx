import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

/** Root + default route error view. Details only in dev; server logs carry the full error. */
export function ErrorView({ error, reset }: ErrorComponentProps) {
	const router = useRouter();

	return (
		<div className="flex min-h-[50svh] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-2xl font-semibold">Something went wrong</h1>
			<p className="max-w-md text-sm text-muted-foreground">
				{import.meta.env.DEV && error instanceof Error
					? error.message
					: "Please try again in a moment."}
			</p>
			<Button
				onClick={() => {
					reset();
					// Re-run loaders so failed queries are fetched again.
					router.invalidate();
				}}
			>
				Try again
			</Button>
		</div>
	);
}
