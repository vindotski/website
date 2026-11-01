import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FormMessage, TextField } from "#/components/form";
import { Button } from "#/components/ui/button";
import { CardContent, CardFooter } from "#/components/ui/card";
import { slugify } from "#/lib/content/slugify";
import { SOMETHING_WENT_WRONG, toFormErrors } from "#/lib/form";
import { newSiteSchema } from "#/lib/site/new-site";
import { createSite } from "#/server/sites.functions";

/**
 * The site's name and slug; the slug follows the name until it's edited by hand. `cancel`: a way
 * back to the dashboard, when there's a site to go back to.
 */
export function NewSiteForm({ cancel = false }: { cancel?: boolean }) {
	const createFn = useServerFn(createSite);
	const [slugEdited, setSlugEdited] = useState(false);
	const form = useForm({
		defaultValues: { name: "", slug: "" },
		validators: {
			onSubmit: newSiteSchema,
			onSubmitAsync: async ({ value }) => {
				try {
					// On success the server function redirects to the dashboard.
					const result = await createFn({ data: value });
					return result && !result.ok ? toFormErrors(result.fieldErrors) : undefined;
				} catch {
					return { form: SOMETHING_WENT_WRONG };
				}
			},
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
		>
			<CardContent className="grid gap-4">
				<form.Field
					name="name"
					listeners={{
						onChange: ({ value }) => {
							if (!slugEdited) form.setFieldValue("slug", slugify(value, 63));
						},
					}}
				>
					{(field) => <TextField field={field} label="Name" autoComplete="off" autoFocus />}
				</form.Field>
				<form.Field name="slug">
					{(field) => (
						<TextField
							field={field}
							label="Slug"
							help="Lowercase letters, numbers and dashes. Identifies the site."
							autoComplete="off"
							spellCheck={false}
							className="font-mono"
							onInput={() => setSlugEdited(true)}
						/>
					)}
				</form.Field>
				<form.Subscribe selector={(s) => s.errorMap.onSubmit}>
					{(error) => <FormMessage errors={typeof error === "string" ? [error] : []} />}
				</form.Subscribe>
			</CardContent>
			<CardFooter className="flex-col gap-2">
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(pending) => (
						<Button type="submit" className="w-full" disabled={pending}>
							{pending ? "Creating…" : "Create site"}
						</Button>
					)}
				</form.Subscribe>
				{cancel && (
					<Button variant="ghost" className="w-full" asChild>
						<Link to="/">Cancel</Link>
					</Button>
				)}
			</CardFooter>
		</form>
	);
}
