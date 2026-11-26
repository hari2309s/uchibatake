import { cropById, type Problem } from "@uchibatake/content";

/*
 * "Something looks wrong?" (07a/07b). The answer is always one of the crop's
 * curated problems, in words ("most likely", "it could also be"), never a
 * percentage. With a photo and a model available, a vision model chooses from
 * that list on the server; otherwise (no key, no network, no photo) the
 * symptom chips narrow the same list by plain rules.
 */

export type Symptom = "holes" | "yellow" | "spots" | "drooping" | "other";

export const SYMPTOMS: { value: Symptom; label: string }[] = [
  { value: "holes", label: "Holes in leaves" },
  { value: "yellow", label: "Yellow leaves" },
  { value: "spots", label: "Spots" },
  { value: "drooping", label: "Drooping" },
  { value: "other", label: "Something else" },
];

/** Words in a curated problem's name or signs that go with each symptom. */
const WORDS: Record<Symptom, string[]> = {
  holes: ["caterpillar", "slug", "snail", "pigeon", "bird", "flea", "miner", "weevil", "moth", "holes"],
  yellow: ["yellow", "mildew", "virus", "aphid", "whitefly", "rust"],
  spots: ["spot", "rust", "mildew", "blight", "mould", "mold", "blister"],
  drooping: ["wilt", "club root", "root fly", "drought", "droop"],
  other: [],
};

export interface Diagnosis {
  likely: Problem | null;
  also: Problem[];
  /** A short plain line about what was seen (from the model), if any. */
  seen: string | null;
  by: "photo" | "symptoms";
}

/** The rules: problems whose name or signs match the chosen symptoms, most matches first. */
export function bySymptoms(cropId: string, symptoms: Symptom[]): Diagnosis {
  const problems = cropById(cropId)?.problems ?? [];
  const scored = problems
    .map((p, i) => {
      const text = `${p.name} ${p.signs ?? ""}`.toLowerCase();
      const score = symptoms.reduce((n, s) => n + (WORDS[s].some((w) => text.includes(w)) ? 1 : 0), 0);
      return { p, score, i };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);
  return { likely: scored[0]?.p ?? null, also: scored.slice(1, 3).map((x) => x.p), seen: null, by: "symptoms" };
}

/** Shrinks a photo on the phone before it goes anywhere: at most 768 px, JPEG. */
export async function shrink(file: File, max = 768): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

/** Asks the server (photo + symptoms → one of the curated problems). Falls back to the rules on any failure. */
export async function diagnose(cropId: string, symptoms: Symptom[], image: string | null): Promise<Diagnosis> {
  const rules = bySymptoms(cropId, symptoms);
  if (!image || (typeof navigator !== "undefined" && !navigator.onLine)) return rules;
  try {
    const res = await fetch("/api/diagnose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cropId, symptoms, image }) });
    if (!res.ok) return rules;
    const j = (await res.json()) as { likely: string | null; also: string[]; seen: string | null };
    const problems = cropById(cropId)?.problems ?? [];
    const find = (id: string | null) => problems.find((p) => p.id === id) ?? null;
    const likely = find(j.likely);
    // No match from the photo: the answer is from what they noticed, alone (nothing from the model is mixed in).
    if (!likely) return rules;
    // Only curated names, signs and fixes are shown: the model's own words aren't (curated content, not model output).
    return { likely, also: j.also.map(find).filter((p): p is Problem => !!p && p.id !== likely.id).slice(0, 2), seen: null, by: "photo" };
  } catch {
    return rules;
  }
}
