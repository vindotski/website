// A fixed-window rate limit kept in memory: per instance, which is enough for one self-hosted app.

export function createRateLimit({ limit, windowMs }: { limit: number; windowMs: number }) {
	const windows = new Map<string, { start: number; count: number }>();
	/** True if `key` may go ahead now (and counts it). */
	return function allow(key: string, now = Date.now()): boolean {
		const current = windows.get(key);
		if (!current || now - current.start >= windowMs) {
			// Forget finished windows now and then, so the map stays small.
			if (windows.size > 10_000) {
				for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
			}
			windows.set(key, { start: now, count: 1 });
			return true;
		}
		current.count++;
		return current.count <= limit;
	};
}
