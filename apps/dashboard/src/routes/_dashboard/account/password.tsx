import { createFileRoute } from "@tanstack/react-router";
import { PasswordPage } from "#/components/account/password";

export const Route = createFileRoute("/_dashboard/account/password")({
	head: () => ({ meta: [{ title: "Password · Spotcraft" }] }),
	component: PasswordPage,
});
