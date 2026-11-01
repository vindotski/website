import { useForm } from "@tanstack/react-form";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormMessage, formError, TextField } from "#/components/form";
import { LIST_ROW } from "#/components/layouts/master-detail";
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
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useSite } from "#/hooks/use-site";
import { SOMETHING_WENT_WRONG, toFormErrors } from "#/lib/form";
import {
	assignableRoles,
	canChangeRole,
	canManageUsers,
	ROLE_LABELS,
	type Role,
} from "#/lib/roles";
import type { CurrentUser } from "#/server/auth.server";
import {
	changeRole,
	inviteUser,
	listUsers,
	removeUser,
	resendInvite,
} from "#/server/users.functions";
import type { AppUser } from "#/server/users.server";

// Settings → Users: the team is a list of its own (the section's list under /settings/users),
// and a person or the invite form is the detail. Site admins and superadmins; others see a notice.
// Only a superadmin can make or change a superadmin.
// Docs: Team and roles.

export const usersQuery = queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });

const backToSettings = { to: "/$site/settings" as const, label: "Back to Settings" };
const backToUsers = { to: "/$site/settings/users" as const, label: "Back to Users" };

/** The people, as the Settings section's list under /settings/users (site admins and up). */
export function UsersMaster({ user }: { user: CurrentUser }) {
	if (!canManageUsers(user.role)) {
		return (
			<>
				<ScreenHeader title="Users" back={backToSettings} />
				<RoleNotice>Only admins can see and manage the team.</RoleNotice>
			</>
		);
	}
	return <UsersList />;
}

function UsersList() {
	const site = useSite();
	const { data } = useSuspenseQuery(usersQuery);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<ScreenHeader
				title="Users"
				back={backToSettings}
				action={
					<Button variant="ghost" size="icon" className="size-9" asChild>
						<Link to="/$site/settings/users/new" params={{ site }} aria-label="Invite someone">
							<Plus className="size-5" />
						</Link>
					</Button>
				}
			/>
			<nav aria-label="Users" className="min-h-0 flex-1 overflow-y-auto">
				{data.users.map((u) => (
					<Link
						key={u.id}
						to="/$site/settings/users/$userId"
						params={{ site, userId: u.id }}
						className={LIST_ROW}
					>
						<span className="grid min-w-0 flex-1">
							<span className="flex min-w-0 items-baseline gap-1">
								<span className="truncate">{u.email}</span>
								{u.id === data.currentUserId && (
									<span className="shrink-0 text-xs text-muted-foreground">(you)</span>
								)}
							</span>
							<span className="text-xs text-muted-foreground">
								{ROLE_LABELS[u.role]} · {u.status === "invited" ? "Invited" : "Active"}
							</span>
						</span>
						<ChevronRight className="size-4 text-muted-foreground" />
					</Link>
				))}
			</nav>
		</div>
	);
}

/** Run a server action, toast the outcome, refresh the list on success. */
function useUserAction<TInput>(
	action: (opts: { data: TInput }) => Promise<{ ok: true } | { ok: false; error?: string }>,
	successMessage: string,
	after?: () => void,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: TInput) => action({ data }),
		onSuccess: (result) => {
			if (result.ok) {
				toast.success(successMessage);
				void queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
				after?.();
			} else {
				toast.error(result.error ?? SOMETHING_WENT_WRONG);
			}
		},
		onError: () => toast.error(SOMETHING_WENT_WRONG),
	});
}

function RoleSelect({
	roles,
	value,
	onChange,
	disabled,
	id,
	label,
}: {
	/** The choices; the current value is always shown, even if it's not one of them. */
	roles: readonly Role[];
	value: Role;
	onChange: (role: Role) => void;
	disabled?: boolean;
	id?: string;
	label?: string;
}) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
			<SelectTrigger id={id} aria-label={label} className="w-40">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{(roles.includes(value) ? roles : [value, ...roles]).map((role) => (
					<SelectItem key={role} value={role}>
						{ROLE_LABELS[role]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** One person: role, status, resend invite, remove. */
export function UserDetail({ userId }: { userId: string }) {
	const site = useSite();
	const { data } = useSuspenseQuery(usersQuery);
	const navigate = useNavigate();
	const changeRoleAction = useUserAction(useServerFn(changeRole), "Role updated");
	const resendAction = useUserAction(useServerFn(resendInvite), "Invite resent");
	const removeAction = useUserAction(useServerFn(removeUser), "User removed", () => {
		void navigate({ to: "/$site/settings/users", params: { site } });
	});
	const person: AppUser | undefined = data.users.find((u) => u.id === userId);
	if (!person) {
		return (
			<>
				<ScreenHeader title="Not found" back={backToUsers} />
				<p className="p-4 text-sm text-muted-foreground">This person isn't on the team anymore.</p>
			</>
		);
	}
	const isSelf = person.id === data.currentUserId;
	// A site admin can see a superadmin but not change or remove them.
	const locked = !canChangeRole(data.currentRole, person.role, null);
	return (
		<>
			<ScreenHeader title={person.email ?? "Someone"} back={backToUsers} />
			<div className="grid max-w-xl gap-6 p-4 md:p-6">
				<dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-4 text-sm">
					<dt className="text-muted-foreground">Role</dt>
					<dd>
						<RoleSelect
							roles={assignableRoles(data.currentRole)}
							value={person.role}
							label={`Role for ${person.email}`}
							disabled={isSelf || locked || changeRoleAction.isPending}
							onChange={(role) => changeRoleAction.mutate({ userId: person.id, role })}
						/>
						{isSelf ? (
							<p className="mt-1 text-xs text-muted-foreground">You can't change your own role.</p>
						) : locked ? (
							<p className="mt-1 text-xs text-muted-foreground">
								Only a superadmin can change a superadmin.
							</p>
						) : null}
					</dd>
					<dt className="text-muted-foreground">Status</dt>
					<dd>
						<Badge variant={person.status === "invited" ? "outline" : "default"}>
							{person.status === "invited" ? "Invited" : "Active"}
						</Badge>
					</dd>
					{person.status === "invited" ? (
						<>
							<dt className="text-muted-foreground">Invited</dt>
							<dd className="tabular-nums">
								<DateTime value={person.invitedAt} />
							</dd>
						</>
					) : (
						<>
							<dt className="text-muted-foreground">Last sign-in</dt>
							<dd className="tabular-nums">
								<DateTime value={person.lastSignInAt} />
							</dd>
						</>
					)}
				</dl>
				<p className="text-xs text-muted-foreground">Role changes and removals apply right away.</p>
				<div className="flex flex-wrap gap-2">
					{person.status === "invited" && (
						<Button
							variant="outline"
							disabled={resendAction.isPending}
							onClick={() => resendAction.mutate({ userId: person.id })}
						>
							{resendAction.isPending ? "Resending…" : "Resend invite"}
						</Button>
					)}
					{!isSelf && !locked && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" className="text-destructive">
									Remove
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle className="break-all">Remove {person.email}?</AlertDialogTitle>
									<AlertDialogDescription>
										{person.status === "invited"
											? "The pending invite link stops working."
											: "They lose access right away."}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										variant="destructive"
										onClick={() => removeAction.mutate({ userId: person.id })}
									>
										Remove
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</div>
		</>
	);
}

/** Invite someone by email, with a role (one the inviter may give). */
export function InviteForm({ actorRole }: { actorRole: Role }) {
	const site = useSite();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const inviteFn = useServerFn(inviteUser);
	const form = useForm({
		defaultValues: { email: "", role: "editor" as Role },
		validators: {
			onSubmitAsync: async ({ value }) => {
				try {
					const result = await inviteFn({ data: value });
					if (result.ok) return undefined;
					return {
						form: result.error ?? result.fieldErrors?.role?.[0],
						...toFormErrors({ email: result.fieldErrors?.email }),
					};
				} catch {
					return { form: SOMETHING_WENT_WRONG };
				}
			},
		},
		onSubmit: async ({ value }) => {
			toast.success(`Invite sent to ${value.email}`);
			await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
			await navigate({ to: "/$site/settings/users", params: { site } });
		},
	});

	return (
		<>
			<ScreenHeader title="Invite someone" back={backToUsers} />
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
				className="grid max-w-xl gap-4 p-4 md:p-6"
			>
				<p className="text-sm text-muted-foreground">
					They'll get an email with a link to set their password. Accounts are invite-only.
				</p>
				<form.Field name="email">
					{(field) => (
						<TextField
							field={field}
							label="Email"
							type="email"
							autoComplete="off"
							spellCheck={false}
							required
							markRequired
						/>
					)}
				</form.Field>
				<form.Field name="role">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="invite-role">Role</Label>
							<RoleSelect
								id="invite-role"
								roles={assignableRoles(actorRole)}
								value={field.state.value}
								onChange={field.handleChange}
							/>
						</div>
					)}
				</form.Field>
				<form.Subscribe selector={(s) => formError(s.errorMap.onSubmit)}>
					{(error) => <FormMessage errors={typeof error === "string" ? [error] : []} />}
				</form.Subscribe>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(pending) => (
						<Button type="submit" className="justify-self-start" disabled={pending}>
							{pending ? "Sending…" : "Send invite"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</>
	);
}
