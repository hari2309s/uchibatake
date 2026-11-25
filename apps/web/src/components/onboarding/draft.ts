import { getMeta, setMeta, type FieldDB } from "@/lib/data/db";
import type { Answers } from "@/lib/onboarding";

/** Onboarding answers, kept on the device as they're given, so leaving mid-way picks up where you were. */
export type Draft = Answers;

export const EMPTY_DRAFT: Draft = { where: [], sun: {}, place: null, people: 2, likes: [], diet: [], name: "", experience: null };

export async function loadDraft(db: FieldDB): Promise<Draft> {
  return { ...EMPTY_DRAFT, ...((await getMeta<Partial<Draft>>(db, "onboarding")) ?? {}) };
}

export function saveDraft(db: FieldDB, d: Draft): Promise<void> {
  return setMeta(db, "onboarding", d);
}

export const STEPS = ["where", "sun", "location", "family", "experience", "plan"] as const;
export type Step = (typeof STEPS)[number];
