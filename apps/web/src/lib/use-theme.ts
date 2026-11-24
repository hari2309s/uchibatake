"use client";

import { useSyncExternalStore } from "react";
import { readTheme, subscribeTheme, type ThemePref } from "./theme";

/** The device's theme preference; "system" during server render. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "system");
}
