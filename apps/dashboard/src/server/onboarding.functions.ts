import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { type OnboardingFieldErrors, validateOnboarding } from "#/lib/onboarding";
import { getCurrentUser } from "./auth.server";
import { getAuth } from "./better-auth.server";
import { serverEnv } from "./env.server";
import { createFirstSuperadmin, hasSuperadmin } from "./onboarding.server";
import { setTokenCookie } from "./session-token.server";
import { currentSite, namedSiteMissing } from "./site.server";

export const needsOnboarding = createServerFn({ method: "GET" }).handler(
	async () => !(await hasSuperadmin()),
);

/**
 * The dashboard guard's one round trip: is setup still needed, is there a site, who's signed in
 * (with their role on the site this request names, else your last or the default), which site
 * that is, whether the request named a site that doesn't exist, and where the app is served
 * (`origin`, for absolute URLs that render the same on the server and in the browser).
 */
export const dashboardGate = createServerFn({ method: "GET" }).handler(async () => {
	const [superadmin, site, missing, user] = await Promise.all([
		hasSuperadmin(),
		currentSite(),
		namedSiteMissing(),
		getCurrentUser(),
	]);
	return {
		needsOnboarding: !superadmin,
		hasSite: site !== null,
		site: site && { slug: site.slug, name: site.name, isDefault: site.isDefault },
		siteMissing: missing,
		user,
		origin: new URL(serverEnv().BETTER_AUTH_URL ?? getRequest().url).origin,
	};
});

const bounded = (max: number) => z.string().max(max);

type OnboardingResult = { ok: false; fieldErrors: OnboardingFieldErrors };

export const completeOnboarding = createServerFn({ method: "POST" })
	.validator(
		z.object({
			email: bounded(320),
			newPassword: bounded(200),
			confirmPassword: bounded(200),
		}),
	)
	.handler(async ({ data }): Promise<OnboardingResult> => {
		const checked = validateOnboarding(data);
		if (!checked.ok) return { ok: false, fieldErrors: checked.fieldErrors };
		const { email, newPassword } = checked.value;

		const created = await createFirstSuperadmin({ email, password: newPassword });
		// Someone else finished onboarding first.
		if (!created.ok && "taken" in created) throw redirect({ to: "/login" });
		if (!created.ok) return { ok: false, fieldErrors: { email: [created.error] } };

		const signedIn = await getAuth()
			.api.signInEmail({ body: { email, password: newPassword }, headers: getRequestHeaders() })
			.catch(() => null);
		if (signedIn) await setTokenCookie(signedIn.user);
		// The dashboard goes on to /new-site while there's no site.
		throw redirect({ to: signedIn ? "/" : "/login" });
	});
