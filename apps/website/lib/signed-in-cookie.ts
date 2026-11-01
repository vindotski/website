// The proxy's "signed in" marker (features/auth/utils/session.ts sets it):
// readable in the browser, unlike Spotcraft's token. Only people who work on
// vin.ski can sign in, so it means it's me
export const SIGNED_IN_COOKIE = "signed-in";

export const sessionCookie = new RegExp(`(?:^|;\\s*)${SIGNED_IN_COOKIE}=1(?:;|$)`);

export const hasSessionCookie = () => sessionCookie.test(document.cookie);
