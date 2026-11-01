import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./model.ts";

// Text to vectors through an OpenAI-compatible `/embeddings` endpoint (plain fetch, no SDK).
// Shared by the server and scripts (Node type stripping: relative imports with extensions).

export type EmbeddingConfig = { apiKey: string; baseUrl: string };

export class EmbeddingError extends Error {}

/** One vector per text, in order. One request: callers send a document's chunks at a time. */
export async function embed(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
	if (!texts.length) return [];
	let response: Response;
	try {
		response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/embeddings`, {
			method: "POST",
			headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				model: EMBEDDING_MODEL,
				input: texts,
				dimensions: EMBEDDING_DIMENSIONS,
			}),
			signal: AbortSignal.timeout(20_000),
		});
	} catch (error) {
		throw new EmbeddingError("The embeddings request failed", { cause: error });
	}
	if (!response.ok) {
		const detail = (await response.text().catch(() => "")).slice(0, 300);
		throw new EmbeddingError(`Embeddings: HTTP ${response.status} ${detail}`.trim());
	}
	const json = (await response.json()) as { data?: { index: number; embedding: number[] }[] };
	const data = json.data ?? [];
	if (data.length !== texts.length) {
		throw new EmbeddingError(`Embeddings: expected ${texts.length}, got ${data.length}`);
	}
	return [...data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
