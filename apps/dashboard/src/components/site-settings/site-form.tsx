import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useBlocker, useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { TextField } from "#/components/form";
import { useEditorBridge } from "#/components/layouts/editor-context";
import { RoleNotice } from "#/components/layouts/role-notice";
import { ScreenHeader } from "#/components/layouts/screen-header";
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
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { useSite } from "#/hooks/use-site";
import { CONTENT_KEY } from "#/integrations/tanstack-query/keys";
import { copyText } from "#/lib/copy";
import { toFormErrors } from "#/lib/form";
import { canManageSite, isSuperadmin } from "#/lib/roles";
import { mySitesQuery, siteSettingsQuery } from "#/lib/site/queries";
import type { SiteSettings } from "#/lib/site/settings";
import type { CurrentUser } from "#/server/auth.server";
import { saveSiteSettings } from "#/server/site-settings.functions";
import type { SiteSettingsRecord } from "#/server/site-settings.server";
import { makeDefault } from "#/server/sites.functions";

// The Site settings page: the site's name and its frontend's address (admins), its API's address,
// and which site is the default (superadmins). Docs: Site settings.

/** Settings → Site: the form for admins, a notice for everyone else. */
export function SiteSettingsPanel({ user }: { user: CurrentUser }) {
	if (!canManageSite(user.role)) {
		return (
			<>
				<ScreenHeader title="Site" back={{ to: "/$site/settings", label: "Back to Settings" }} />
				<RoleNotice>Only admins can change the site's settings.</RoleNotice>
			</>
		);
	}
	return <SiteSettingsLoaded superadmin={isSuperadmin(user.role)} />;
}

function SiteSettingsLoaded({ superadmin }: { superadmin: boolean }) {
	const { data } = useSuspenseQuery(siteSettingsQuery);
	// Starts over when the saved version changes underneath (e.g. after a reload).
	return <SiteSettingsForm key={data.updatedAt} saved={data} superadmin={superadmin} />;
}

/** The site's API address, and whether it's the default (what the bare /api and /media serve). */
function SiteAddress({ superadmin }: { superadmin: boolean }) {
	const site = useSite();
	const queryClient = useQueryClient();
	const makeDefaultFn = useServerFn(makeDefault);
	const [busy, setBusy] = useState(false);
	// Loaded by /_dashboard, so the default-site part doesn't flash.
	const { data: sites } = useSuspenseQuery(mySitesQuery);
	const isDefault = sites.find((s) => s.slug === site)?.isDefault ?? false;
	const { origin } = useRouteContext({ from: "/_dashboard" });
	const url = `${origin}/${site}/api`;

	async function choose() {
		setBusy(true);
		try {
			await makeDefaultFn();
			await queryClient.invalidateQueries({ queryKey: mySitesQuery.queryKey });
			toast.success("This is now the default site");
		} catch {
			toast.error("Couldn't change the default site. Try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Section title="Address" description="Frontends read this site's content and images from here.">
			<div className="flex items-center gap-2">
				<code className="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">
					{url}
				</code>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Copy API address"
					onClick={() => copyText(url, "the API address")}
				>
					<Copy className="size-4" />
				</Button>
			</div>
			{isDefault ? (
				<p className="text-sm text-muted-foreground">
					This is the default site: <code>{origin}/api</code> and <code>{origin}/media</code> serve
					it too.
				</p>
			) : superadmin ? (
				<div className="flex flex-wrap items-center gap-3">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="outline" size="sm" disabled={busy}>
								{busy ? "Changing…" : "Make this the default site"}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Make this the default site?</AlertDialogTitle>
								<AlertDialogDescription>
									Frontends that use the bare /api and /media will get this site's content.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => void choose()}>Make default</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<p className="text-sm text-muted-foreground">
						The default site is also served at <code>{origin}/api</code> and{" "}
						<code>{origin}/media</code>.
					</p>
				</div>
			) : null}
		</Section>
	);
}

/** The form edits text; a missing address shows as an empty input. */
type Draft = { siteName: string; siteUrl: string };

const toDraft = (s: SiteSettings): Draft => ({ siteName: s.siteName, siteUrl: s.siteUrl ?? "" });

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="grid gap-4">
			<div>
				<h2 className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
					{title}
				</h2>
				{description && <p className="text-sm text-muted-foreground">{description}</p>}
			</div>
			{children}
		</section>
	);
}

function SiteSettingsForm({
	saved,
	superadmin,
}: {
	saved: SiteSettingsRecord;
	superadmin: boolean;
}) {
	const queryClient = useQueryClient();
	const saveFn = useServerFn(saveSiteSettings);
	const [baseline, setBaseline] = useState(() => toDraft(saved));
	const [version, setVersion] = useState(saved.updatedAt);
	const [conflict, setConflict] = useState<{ updatedAt: string; updatedBy: string | null } | null>(
		null,
	);
	const conflictRef = useRef<HTMLDivElement>(null);
	const leaving = useRef(false);
	// What the last successful save stored, handed from validation to onSubmit.
	const stored = useRef<SiteSettingsRecord | null>(null);

	const form = useForm({
		defaultValues: baseline,
		validators: {
			onSubmitAsync: async ({ value }) => {
				try {
					const result = await saveFn({ data: { values: value, expectedUpdatedAt: version } });
					if (result.ok) {
						stored.current = result.settings;
						return undefined;
					}
					if (result.conflict) {
						setConflict(result.conflict);
						toast.error("Someone else saved the settings in the meantime.");
						return { form: "conflict" };
					}
					toast.error("Fix the highlighted settings first.");
					return toFormErrors(result.fieldErrors ?? {});
				} catch {
					toast.error("Couldn't save. Try again.");
					return { form: "failed" };
				}
			},
		},
		onSubmit: async () => {
			const settings = stored.current;
			if (!settings) return;
			const next = toDraft(settings);
			setBaseline(next);
			form.reset(next);
			setVersion(settings.updatedAt);
			leaving.current = true; // the query refresh re-keys the form
			await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
			toast.success("Saved");
		},
	});

	const values = useStore(form.store, (s) => s.values);
	const pending = useStore(form.store, (s) => s.isSubmitting);
	const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
	const blocker = useBlocker({
		shouldBlockFn: () => dirty && !leaving.current,
		enableBeforeUnload: () => dirty && !leaving.current,
		withResolver: true,
	});
	const save = () => void form.handleSubmit();

	useEditorBridge(
		{ path: "site.yaml", dirty, saving: pending, conflict: !!conflict, view: "form" },
		{
			save,
			showConflict: () => conflictRef.current?.scrollIntoView({ behavior: "smooth" }),
		},
	);

	const text = (
		key: Exclude<keyof Draft, "noindex">,
		label: string,
		props: {
			help?: string;
			placeholder?: string;
			type?: string;
			mono?: boolean;
			required?: boolean;
		} = {},
	) => (
		<form.Field name={key}>
			{(field) => (
				<TextField
					field={field}
					label={label}
					help={props.help}
					markRequired={props.required}
					type={props.type ?? "text"}
					placeholder={props.placeholder}
					className={props.mono ? "font-mono text-sm" : undefined}
				/>
			)}
		</form.Field>
	);

	return (
		<>
			<ScreenHeader
				title="Site"
				back={{ to: "/$site/settings", label: "Back to Settings" }}
				action={
					<Button size="sm" className="h-8" disabled={pending || !dirty} onClick={save}>
						{pending ? "Saving…" : dirty ? "Save" : "Saved"}
					</Button>
				}
			/>
			<div className="grid w-full max-w-2xl gap-10 px-4 py-6 md:px-8 md:py-10">
				<form
					className="grid content-start gap-10"
					onSubmit={(e) => {
						e.preventDefault();
						save();
					}}
				>
					{conflict && (
						<div
							ref={conflictRef}
							role="alert"
							className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
						>
							<p className="font-medium">The settings changed while you were editing.</p>
							<p className="mt-1 text-muted-foreground">
								{conflict.updatedBy ?? "Someone"} saved them <DateTime value={conflict.updatedAt} />
								. Saving now would overwrite their changes, so it was blocked.
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => {
									leaving.current = true;
									window.location.reload();
								}}
							>
								Reload latest version
							</Button>
						</div>
					)}

					<Section title="Identity">
						{text("siteName", "Site name", {
							required: true,
							help: "Shown in the dashboard; frontends read it from the API.",
						})}
						{text("siteUrl", "Site address", {
							type: "url",
							mono: true,
							placeholder: "https://example.com",
							help: "Where your frontend lives, without a path. View site opens it.",
						})}
					</Section>
				</form>
				<SiteAddress superadmin={superadmin} />
				<p className="font-mono text-xs text-muted-foreground">
					Saved <DateTime value={saved.updatedAt} />
					{saved.updatedBy ? ` by ${saved.updatedBy}` : ""}
				</p>
			</div>

			<AlertDialog open={blocker.status === "blocked"}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave without saving?</AlertDialogTitle>
						<AlertDialogDescription>
							Your unsaved changes to the site settings will be lost.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => blocker.reset?.()}>Keep editing</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
							Leave
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
