import { useEffect, useRef } from "react";

// Cloudflare Turnstile's check, on the sign-in and forgot-password forms when it's on
// (TURNSTILE_SITE_KEY; the server checks the token, src/server/turnstile.server.ts).

type TurnstileApi = {
	render: (
		element: HTMLElement,
		options: {
			sitekey: string;
			theme: "auto";
			callback: (token: string) => void;
			"expired-callback": () => void;
			"error-callback": () => void;
		},
	) => string;
	remove: (id: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
	loading ??= new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = SCRIPT;
		script.async = true;
		script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject());
		script.onerror = () => {
			loading = undefined;
			reject();
		};
		document.head.append(script);
	});
	return loading;
}

/**
 * The widget. `onToken` gets its token, or null when it expires or fails. A token works once:
 * change `attempt` after each submit for a fresh check.
 */
export function Turnstile({
	siteKey,
	attempt,
	onToken,
}: {
	siteKey: string;
	attempt: number;
	onToken: (token: string | null) => void;
}) {
	const container = useRef<HTMLDivElement>(null);
	const callback = useRef(onToken);
	useEffect(() => {
		callback.current = onToken;
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` asks for a fresh check.
	useEffect(() => {
		let id: string | undefined;
		let cancelled = false;
		callback.current(null);
		loadTurnstile()
			.then((turnstile) => {
				if (cancelled || !container.current) return;
				id = turnstile.render(container.current, {
					sitekey: siteKey,
					theme: "auto",
					callback: (token) => callback.current(token),
					"expired-callback": () => callback.current(null),
					"error-callback": () => callback.current(null),
				});
			})
			.catch(() => callback.current(null));
		return () => {
			cancelled = true;
			if (id) window.turnstile?.remove(id);
		};
	}, [siteKey, attempt]);

	// The widget's height, so the form doesn't jump when it appears.
	return <div ref={container} className="min-h-[65px]" />;
}
