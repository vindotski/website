import { readWebhook } from "@spotcraft/client";
import { revalidateTag } from "next/cache";
import { contentTag } from "@/lib/content/api";

// Spotcraft's webhook: content was published, changed, moved or removed, so
// the cached content is dropped and the next visit fetches it again. Spotcraft
// sends no session, so proxy.ts leaves this route alone; the signature is the
// check
//
//   POST /api/spotcraft   X-Spotcraft-Signature: sha256=…

// One Spotcraft can hold several sites, and its webhook hears about all of
// them. Ours is the last part of SPOTCRAFT_URL (…/vinski); without one, it's
// Spotcraft's default site, so every webhook counts
const site = new URL(process.env.SPOTCRAFT_URL!).pathname
  .split("/")
  .filter(Boolean)
  .at(-1);

export async function POST(request: Request) {
  const hook = await readWebhook(request, process.env.SPOTCRAFT_WEBHOOK_SECRET!);
  if (!hook) return new Response("Bad signature", { status: 401 });
  if (site && hook.site !== site) return new Response(null, { status: 204 });
  // Stale content is never served: the next visit waits for fresh content,
  // so a reload right after publishing shows the change
  revalidateTag(contentTag, { expire: 0 });
  return new Response(null, { status: 204 });
}
