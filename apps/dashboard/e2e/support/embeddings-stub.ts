import { createServer, type Server } from "node:http";
import { EMBEDDING_DIMENSIONS } from "../../src/lib/search/model";

// A stand-in for OpenAI's /embeddings, so search runs in e2e (and CI) without a key or network:
// each word is hashed to one dimension, so texts sharing words are close. Any input containing
// FAIL_WORD gets a 500, to test the API's "unavailable" path.

export const STUB_PORT = 3199;
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}/v1`;
export const FAIL_WORD = "stubfailure";

function vectorOf(text: string): number[] {
	const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
	for (const word of text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []) {
		let hash = 2166136261;
		for (const char of word) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
		vector[(hash >>> 0) % EMBEDDING_DIMENSIONS] += 1;
	}
	const norm = Math.hypot(...vector) || 1;
	return vector.map((v) => v / norm);
}

export function startEmbeddingsStub(): Promise<Server> {
	const server = createServer((req, res) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", () => {
			const input: string[] = req.url === "/v1/embeddings" ? (JSON.parse(body).input ?? []) : [];
			if (!input.length || input.some((t) => t.includes(FAIL_WORD))) {
				res.writeHead(500).end("stub failure");
				return;
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({ data: input.map((t, index) => ({ index, embedding: vectorOf(t) })) }),
			);
		});
	});
	return new Promise((resolve) => server.listen(STUB_PORT, "127.0.0.1", () => resolve(server)));
}
