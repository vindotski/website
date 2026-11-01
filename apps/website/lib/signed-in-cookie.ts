// The proxy's "signed in" marker (features/auth/utils/session.ts): readable in
// the browser, unlike Spotcraft's token. Only people who work on vin.ski can
// sign in, so it means it's me
export const sessionCookie = /(?:^|;\s*)signed-in=1(?:;|$)/;

export const hasSessionCookie = () => sessionCookie.test(document.cookie);
