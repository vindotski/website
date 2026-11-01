import { MAILPIT_URL } from "./env";

type MessageSummary = { ID: string; To: { Address: string }[] };

async function messagesTo(address: string): Promise<MessageSummary[]> {
	const res = await fetch(`${MAILPIT_URL}/messages?limit=200`);
	const body = (await res.json()) as { messages: MessageSummary[] };
	return body.messages.filter((m) => m.To?.some((t) => t.Address === address));
}

export async function clearInbox() {
	await fetch(`${MAILPIT_URL}/messages`, { method: "DELETE" });
}

/** IDs of mail already received by `address` — pass to waitForLink so only new mail counts. */
export async function mailIds(address: string) {
	return new Set((await messagesTo(address)).map((m) => m.ID));
}

/** Waits for a new email to `address` and returns its link (a Better Auth reset-password link). */
export async function waitForLink(address: string, seen: Set<string>, timeoutMs = 10_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const fresh = (await messagesTo(address)).find((m) => !seen.has(m.ID));
		if (fresh) {
			const message = (await (await fetch(`${MAILPIT_URL}/message/${fresh.ID}`)).json()) as {
				Text: string;
			};
			const link = message.Text.match(/https?:\/\/\S+\/api\/auth\/reset-password\/\S+/)?.[0];
			if (!link) throw new Error(`Email to ${address} has no link`);
			return link;
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error(`No new email to ${address} within ${timeoutMs} ms`);
}

/** Total message count for `address` (to assert that *no* mail was sent). */
export async function mailCount(address: string) {
	return (await messagesTo(address)).length;
}
