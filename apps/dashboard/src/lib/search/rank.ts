// Merging search's two rankings, keyword (Postgres full-text) and semantic (embeddings), by
// reciprocal rank fusion: each list gives a chunk 1 / (K + its rank), summed. Ranks, not raw
// scores, so the two scales never need to agree. Pure. Docs: Reading content from your site.

const K = 60;

export type Ranked<T> = { item: T; score: number };

/**
 * One list, best first, from both rankings (each best first, items identified by `key`). `score`
 * is 0–1: 1 for a chunk first in both lists.
 */
export function fuse<T>(keyword: T[], semantic: T[], key: (item: T) => string): Ranked<T>[] {
	const best = 2 / (K + 1);
	const merged = new Map<string, Ranked<T>>();
	for (const list of [keyword, semantic]) {
		list.forEach((item, rank) => {
			const id = key(item);
			const entry = merged.get(id) ?? { item, score: 0 };
			entry.score += 1 / (K + rank + 1);
			merged.set(id, entry);
		});
	}
	return [...merged.values()]
		.map((r) => ({ ...r, score: r.score / best }))
		.sort((a, b) => b.score - a.score);
}
