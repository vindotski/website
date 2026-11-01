import { AwsClient } from "aws4fetch";

// Image files in any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase Storage, Backblaze B2,
// SeaweedFS locally), with path-style URLs: `<endpoint>/<bucket>/<key>`. Objects are private:
// Spotcraft serves them itself (/media). Shared by the server and scripts (Node type stripping).
// Docs: Images.

export type StorageConfig = {
	endpoint: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
};

export class StorageError extends Error {}

/** S3 settings from the environment, or null when images are off (no S3_BUCKET). */
export function storageConfigFrom(env: Record<string, string | undefined>): StorageConfig | null {
	if (!env.S3_BUCKET || !env.S3_ENDPOINT) return null;
	return {
		endpoint: env.S3_ENDPOINT.replace(/\/$/, ""),
		bucket: env.S3_BUCKET,
		accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
		secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
		region: env.S3_REGION || "auto",
	};
}

export function createStorage(config: StorageConfig) {
	const aws = new AwsClient({
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		region: config.region,
		service: "s3",
	});
	const url = (key: string) =>
		`${config.endpoint}/${config.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

	async function send(method: string, key: string, init: RequestInit = {}) {
		try {
			return await aws.fetch(url(key), { method, ...init, signal: AbortSignal.timeout(30_000) });
		} catch (error) {
			throw new StorageError(`Storage: ${method} failed`, { cause: error });
		}
	}

	return {
		async put(key: string, bytes: Uint8Array, mime: string) {
			const res = await send("PUT", key, {
				// Node Buffers are views on an ArrayBufferLike; fetch accepts them all the same.
				body: bytes as Uint8Array<ArrayBuffer>,
				headers: { "Content-Type": mime, "Content-Length": String(bytes.length) },
			});
			if (!res.ok) throw new StorageError(`Storage: PUT HTTP ${res.status}`);
		},
		/** The object as a response (streams), or null if there's none. */
		async get(key: string): Promise<Response | null> {
			const res = await send("GET", key);
			if (res.status === 404) return null;
			if (!res.ok) throw new StorageError(`Storage: GET HTTP ${res.status}`);
			return res;
		},
		async remove(key: string) {
			const res = await send("DELETE", key);
			if (!res.ok && res.status !== 404)
				throw new StorageError(`Storage: DELETE HTTP ${res.status}`);
		},
		/** Creates the bucket if it doesn't exist (local setup and tests). */
		async ensureBucket() {
			const head = await aws
				.fetch(`${config.endpoint}/${config.bucket}`, { method: "HEAD" })
				.catch(() => null);
			if (head?.ok) return;
			const res = await aws.fetch(`${config.endpoint}/${config.bucket}`, { method: "PUT" });
			if (!res.ok && res.status !== 409)
				throw new StorageError(`Storage: bucket HTTP ${res.status}`);
		},
	};
}

export type Storage = ReturnType<typeof createStorage>;

/** An image's object key: by site and entry id, so renaming or moving it never moves the object. */
export const imageKey = (siteId: string, entryId: string) => `${siteId}/${entryId}`;
