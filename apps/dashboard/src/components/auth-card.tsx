import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { sourceUrl } from "#/env";

/** Centered card shell for signed-out pages (sign in, forgot / reset password). */
export function AuthCard({
	title,
	description,
	children,
}: {
	title: string;
	description: ReactNode;
	children: ReactNode;
}) {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<Sparkles className="size-5" />
					</div>
					<CardTitle className="text-xl">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				{children}
			</Card>
			<p className="text-xs text-muted-foreground">
				Spotcraft ·{" "}
				<a href={sourceUrl} className="underline-offset-4 hover:underline">
					Source code
				</a>
			</p>
		</main>
	);
}
