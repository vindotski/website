// A Supabase session cookie: sb-<ref>-auth-token, split into .0, .1… when
// large. Readable in the browser, since @supabase/ssr cookies aren't httpOnly.
// Sign-ups are off, so a session means it's me
export const sessionCookie = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

export const hasSessionCookie = () => sessionCookie.test(document.cookie);
