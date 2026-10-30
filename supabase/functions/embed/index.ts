import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1";

// Embeds text with gte-small: 384 dimensions, normalized, so the inner product
// in match_documents ranks like cosine. Only the sync script and the search
// route call it, with the secret key on `apikey`. Inputs past ~512 tokens are
// truncated by the model, so callers keep chunks short

const model = new Supabase.ai.Session("gte-small");

// One sync batch or one search query; keeps a single call bounded
const maxInputs = 64;
const maxChars = 4000;

type Body = { input?: unknown };

function isValidInput(input: unknown): input is string[] {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.length <= maxInputs &&
    input.every(
      (text) =>
        typeof text === "string" &&
        text.trim() !== "" &&
        text.length <= maxChars,
    )
  );
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Use POST" }, { status: 405 });
    }
    const { input } = ((await req.json().catch(() => ({}))) ?? {}) as Body;
    if (!isValidInput(input)) {
      return Response.json(
        {
          error: `Send { input: string[] }: 1–${maxInputs} non-empty strings of up to ${maxChars} characters`,
        },
        { status: 400 },
      );
    }

    const embeddings: number[][] = [];
    for (const text of input) {
      const output = await model.run(text, { mean_pool: true, normalize: true });
      embeddings.push(output as number[]);
    }
    return Response.json({ embeddings });
  }),
};
