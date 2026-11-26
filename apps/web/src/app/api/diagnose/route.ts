import { cropById } from "@uchibatake/content";

/*
 * Plant diagnosis (07a → 07b), server side only: keys never reach the
 * browser. The photo is sent to a free vision model (Groq, else OpenRouter)
 * with the crop's curated problem list, and the model must pick from that
 * list. The photo isn't stored or logged here.
 */

const MAX_IMAGE_CHARS = 2_000_000; // ~1.5 MB of base64 (the phone shrinks it to 768 px first)

/*
 * Only this app may use the route (same origin), and each address gets a few
 * looks per ten minutes, so the free model key isn't spent by anyone else.
 * The counter is per server instance: a best-effort guard, not a quota system.
 */
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 8;
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  const from = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !from) return false;
  try {
    return new URL(from).host === host;
  } catch {
    return false;
  }
}
const SYMPTOM_WORDS: Record<string, string> = { holes: "holes in leaves", yellow: "yellow leaves", spots: "spots", drooping: "drooping", other: "something else" };

interface Provider {
  url: string;
  key: string;
  model: string;
  name: string;
}

function provider(): Provider | null {
  if (process.env.GROQ_API_KEY)
    return { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct" };
  if (process.env.OPENROUTER_API_KEY)
    return { name: "openrouter", url: "https://openrouter.ai/api/v1/chat/completions", key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_VISION_MODEL || "google/gemma-3-27b-it:free" };
  return null;
}

export async function POST(req: Request) {
  const p = provider();
  if (!p) return Response.json({ error: "no-model" }, { status: 503 });
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allowed(ip)) return Response.json({ error: "slow-down" }, { status: 429 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object") return Response.json({ error: "bad-request" }, { status: 400 });
  const body = raw as { cropId?: unknown; symptoms?: unknown; image?: unknown };
  const crop = typeof body.cropId === "string" ? cropById(body.cropId) : undefined;
  const problems = crop?.problems ?? [];
  if (!crop || !problems.length || typeof body.image !== "string" || !body.image.startsWith("data:image/") || body.image.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  const image = body.image;
  const symptoms = (Array.isArray(body.symptoms) ? body.symptoms : []).filter((s): s is string => typeof s === "string" && Object.hasOwn(SYMPTOM_WORDS, s)).map((s) => SYMPTOM_WORDS[s]);

  const list = problems.map((x) => `- ${x.id}: ${x.name}${x.signs ? ` (${x.signs})` : ""}`).join("\n");
  const system =
    `You help a beginner gardener look at a photo of their ${crop.name.toLowerCase()}. ` +
    `Choose ONLY from these known problems for ${crop.name.toLowerCase()}:\n${list}\n` +
    `Reply with JSON only: {"likely": "<id or null>", "also": ["<id>", ...], "seen": "<one short, calm sentence about what you see>"}. ` +
    `Use null for likely if the photo doesn't show a plant, or none of the problems fit. Never give percentages or advice.`;
  const user = `They noticed: ${symptoms.join(", ") || "nothing specific"}.`;

  try {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { authorization: `Bearer ${p.key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: p.model,
        temperature: 0.2,
        max_tokens: 200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [{ type: "text", text: user }, { type: "image_url", image_url: { url: image } }] },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return Response.json({ error: "model-unavailable" }, { status: 502 });
    const j = await res.json();
    const text: string = j.choices?.[0]?.message?.content ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const ids = new Set(problems.map((x) => x.id));
    const likely = typeof json.likely === "string" && ids.has(json.likely) ? json.likely : null;
    const also = Array.isArray(json.also) ? json.also.filter((x: unknown) => typeof x === "string" && ids.has(x) && x !== likely).slice(0, 2) : [];
    const seen = typeof json.seen === "string" ? json.seen.slice(0, 200) : null;
    return Response.json({ likely, also, seen, by: p.name });
  } catch {
    return Response.json({ error: "model-unavailable" }, { status: 502 });
  }
}
