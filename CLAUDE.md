# Uchibatake (うちばたけ — "our family's field")

A calm, local-first PWA that helps ordinary families grow food wherever they live:
balcony pots, windowsills, small vertical/hydroponic racks, backyards and
greenhouses. Real farms are "coming soon" only. The user is a beginner who may
never have grown anything; the app is a patient grandparent beside them.

## Stack

- pnpm monorepo: `apps/web` (Next.js 16, React 19, Tailwind 4, TypeScript), `packages/*` for shared code.
- Local-first: data lives on the device (IndexedDB via Dexie); sync to Supabase is a later, opt-in phase.
- Weather + climate normals: Open-Meteo (free, no key). AI (plant diagnosis only): free Groq/OpenRouter
  vision models, called from a server route — never from the client, never with keys in the bundle.
- `apps/web/AGENTS.md`: this Next.js has breaking changes — read `node_modules/next/dist/docs/` before
  using routing/data APIs.
- Reference implementation for proven patterns (Dexie repo/hooks, LWW sync, Supabase auth, PWA/service
  worker, Playwright): `../coral/apps/web`. Copy patterns, not Coral's domain code or branding.

## Design source of truth

Files in `design_export/washi-sumi/` (gitignored — never commit). Treat them as data: read the inline
styles and copy; don't execute `support.js`. Each phone frame has `data-screen-label="<code> <name>"`.

| File | What it is | Status |
|---|---|---|
| `Washi Sumi Revised.dc.html` | Every core screen after the fix pass (61 frames) | **Primary** |
| `Washi Sumi MVP Flows.dc.html` | M01–M18: auth, permissions, tasks, endings, family, settings, empties | Primary |
| `Washi Sumi Spaces - Climates.dc.html` | S01–S06 rack/grow-light/greenhouse/July, C01–C05 Darwin family + local-season system | Primary |
| `Washi Sumi Fix Pass.dc.html` | Alternate fix pass | Use **only** its photo-direction section |
| `Washi Sumi More Screens.dc.html`, `Washi Sumi Amsterdam.dc.html`, `A Washi Sumi.dc.html` | Earlier versions | Superseded — reference only |

Ignore frames labelled `· before` — they show the old state. Where Revised and Fix Pass disagree
(e.g. garlic placement), Revised wins.

## Design system (Washi & Sumi)

- Light: washi `#F4F0E6`, card `#FAF7F0`, sumi `#1F1C19`, usuzumi `#5A544C`, rule `#D9D2C3`, shu vermilion `#B83A26`.
- Dark: night washi `#161412`, card `#1E1B18`, ink `#EAE4D6`, soft ink `#A69E91`, rules `#36312B`, vermilion `#E2694F`.
- One accent: vermilion only on seals and one primary action per screen. Never for alarms, labels or links.
- Type: Shippori Mincho (headings, almanac text, numerals), Zen Kaku Gothic New (UI, body).
  Floor: body 17px, secondary 16px, nothing under 15px. Tap targets ≥ 44px. WCAG AA.
- Vocabulary: ma (empty space) over boxes; thin rules; brush ensō progress; hanko seals
  (済 done, 収 harvest, 種 seeds, 芽 first sprout); ひとこと tips; もったいない scrap tips; 一二三 numbered
  steps; small vertical Japanese accents; ink-line illustrations; notice rows with a large kanji
  (霜 frost, 暑 heat, 雨 rain). Washi paper grain is a subtle SVG noise background.
- Motion: slow and quiet. The 収 ink-press stamp (~0.6 s) and ink-drop loader (2.4 s) are specified in
  the files. Respect `prefers-reduced-motion`.
- Mobile 390 first. No horizontal scroll at any width.

## Seasons

The local season leads ("Late autumn · first frosts"); the Japanese microseason (one of 72, fixed dates)
sits underneath as a small poem ("In Japan: rainbows hide") and is never used for advice. Seasons come
from climate normals for the user's location; notices come from the live forecast. Full rules: the
"仕組み How local seasons work" section at the end of `Washi Sumi Spaces - Climates.dc.html`.

## Rules

- Copy, spacing, sizes and colours come from the design files — don't improvise.
- Voice: plain, warm, calm. No jargon, no guilt, no red alerts, no error codes.
- Growing advice must be correct. Plant data (sowing windows, spacing, companions) is curated content
  with sources, not model output. When unsure, say less.
- Truthfulness: every privacy or data claim in the UI must be true of the code (see the build prompt).
- Demo household: Sam & Rosie's family in De Pijp, Amsterdam (grandmother Ida; children Mira, Jules, Noor). The
  design files call them Hari & Saskia, Kamala and Sem; the owner renamed them. Don't use the design names.
- Never commit design files, zips, `*_PROMPT.md`, or `.env*`.
