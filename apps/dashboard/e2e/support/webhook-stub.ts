import { createServer, type Server } from "node:http";

// A frontend's webhook endpoint, for e2e: records every POST (event, signature, body) and lists
// them at GET /events, so suites (which run in other processes) can check what was sent.

export const WEBHOOK_PORT = 3198;
export const WEBHOOK_URL = `http://127.0.0.1:${WEBHOOK_PORT}/hook`;
export const WEBHOOK_SECRET = "e2e-webhook-secret-0123456789";
/** The e2e server's SPOTCRAFT_API_TOKEN. */
export const API_TOKEN = "e2e-api-token-0123456789abcdef0123456789";

export type Received = { event: string; signature: string; body: string };

export function startWebhookStub(): Promise<Server> {
	const received: Received[] = [];
	const server = createServer((req, res) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", () => {
			if (req.method === "POST" && req.url === "/hook") {
				received.push({
					event: String(req.headers["x-spotcraft-event"]),
					signature: String(req.headers["x-spotcraft-signature"]),
					body,
				});
				res.writeHead(204).end();
			} else if (req.method === "GET" && req.url === "/events") {
				res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(received));
			} else res.writeHead(404).end();
		});
	});
	return new Promise((resolve) => server.listen(WEBHOOK_PORT, "127.0.0.1", () => resolve(server)));
}

/** Everything the stub has received so far. */
export async function receivedWebhooks(): Promise<Received[]> {
	return (await fetch(`http://127.0.0.1:${WEBHOOK_PORT}/events`)).json() as Promise<Received[]>;
}
