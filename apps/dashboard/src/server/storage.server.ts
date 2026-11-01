import { createStorage, type Storage, storageConfigFrom } from "#/lib/storage";
import { serverEnv } from "./env.server";

// The image bucket, from S3_* (src/lib/storage.ts). Null when images are off. The bucket is
// created on first use if it doesn't exist (handy locally; a no-op check elsewhere). Server-only.

let storage: Promise<Storage> | undefined;

export function imagesEnabled() {
	return storageConfigFrom(serverEnv()) !== null;
}

/** The bucket, or null when images are off. */
export async function getStorage(): Promise<Storage | null> {
	const config = storageConfigFrom(serverEnv());
	if (!config) return null;
	storage ??= (async () => {
		const s = createStorage(config);
		await s.ensureBucket();
		return s;
	})().catch((error: unknown) => {
		storage = undefined; // try again next time
		throw error;
	});
	return storage;
}
