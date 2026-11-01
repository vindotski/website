// Writes the public API's OpenAPI spec (the same one /api/openapi.json serves) to a file, without a
// database or a running server: the router is loaded through Vite, which resolves the app's `#/`
// imports. Usage: pnpm openapi [file] (default: openapi.json). @spotcraft/client is generated from
// it. Plain Node (type stripping).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createServer } from "vite";

const target = resolve(process.argv[2] ?? "openapi.json");

const vite = await createServer({
	configFile: false,
	appType: "custom",
	logLevel: "error",
	resolve: { tsconfigPaths: true },
	server: { middlewareMode: true, hmr: false, ws: false },
});
try {
	const { router } = await vite.ssrLoadModule("/src/server/api/router.server.ts");
	const { specInfo } = await vite.ssrLoadModule("/src/server/api/spec.server.ts");
	const spec = await new OpenAPIGenerator({
		schemaConverters: [new ZodToJsonSchemaConverter()],
	}).generate(router, { info: specInfo });
	writeFileSync(target, `${JSON.stringify(spec, null, "\t")}\n`);
	console.log(`Wrote the OpenAPI spec to ${target}`);
} finally {
	await vite.close();
}
