"use client";

import { useSyncExternalStore } from "react";
import { isoDate } from "./dates";

const noop = () => () => {};

/** Today's local date ("YYYY-MM-DD"), or null during server render and hydration (pages are prerendered). */
export function useToday(): string | null {
  return useSyncExternalStore(noop, () => isoDate(), () => null);
}
