import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";

/**
 * Shippori Mincho (headings, almanac, numerals) and Zen Kaku Gothic New (UI).
 * Only Latin is preloaded; next/font still self-hosts the Japanese slices
 * (unicode-range), so the browser fetches just the kanji a page uses.
 */
export const mincho = Shippori_Mincho({ variable: "--font-shippori", weight: ["400", "500", "700"], subsets: ["latin"], display: "swap" });
export const gothic = Zen_Kaku_Gothic_New({ variable: "--font-zen-kaku", weight: ["400", "500", "700"], subsets: ["latin"], display: "swap" });

export const fontClasses = `${mincho.variable} ${gothic.variable}`;
