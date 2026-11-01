import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";

/**
 * Dev only: Nitro's dev server hands anything that looks like a static asset (an image's extension,
 * or a browser's <img> fetch) to Vite's file serving, so /media/… and /<site>/media/… (images
 * served by the app) would 404. Mark those requests as pages, and they reach the app's routes as in
 * production.
 */
const mediaInDev: Plugin = {
	name: "spotcraft:media-in-dev",
	apply: "serve",
	configureServer(server) {
		server.middlewares.use((req, _res, next) => {
			if (req.url && /^\/([a-z0-9-]+\/)?media\//.test(req.url)) {
				delete req.headers["sec-fetch-dest"];
				req.headers.accept = "text/html";
			}
			next();
		});
	},
};

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		mediaInDev,
		devtools(),
		// This Nitro beta only knows Node ≤24 and ignores package.json engines when picking the
		// Vercel function runtime; pin it to match engines.node (26.x). Ignored by non-Vercel presets.
		nitro({ vercel: { functions: { runtime: "nodejs26.x" } } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
