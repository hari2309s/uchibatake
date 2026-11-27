<div align="center">

<img src="apps/web/src/app/icon.png" width="100" height="100" alt="Uchibatake icon: an open ensō with the 畑 seal">

# Uchibatake · うちばたけ

### Our family's field.

Grow a little food for the people you love — on a balcony, a windowsill, a rack in the hallway, a backyard or a
greenhouse. A calm, local-first PWA for beginners: the app is a patient grandparent beside you. Your field lives
on your phone; nothing needs an account to work.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hari2309s/uchibatake&root-directory=apps/web)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![View Transitions](https://img.shields.io/badge/View_Transitions-React_19-1F1C19?logo=react&logoColor=white)

![Local-first](https://img.shields.io/badge/Local--first-IndexedDB-B83A26)
![Dexie](https://img.shields.io/badge/Dexie-live_queries-1F1C19)
![Supabase](https://img.shields.io/badge/Supabase-Auth_(Google_%2B_email)-3ECF8E?logo=supabase&logoColor=white)
![Open-Meteo](https://img.shields.io/badge/Open--Meteo-forecast_%2B_climate-FF8800)
![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-place_names-7EBC6F?logo=openstreetmap&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable_%2B_offline-5A0FC8?logo=pwa&logoColor=white)
![Web Push](https://img.shields.io/badge/Web_Push-daily_note-1F1C19)
![Groq](https://img.shields.io/badge/Groq_%2F_OpenRouter-plant_diagnosis-F55036)

![Curated content](https://img.shields.io/badge/Crops-RHS_·_UNH_·_Johnny's-5A544C)
![Regions](https://img.shields.io/badge/For-EU_·_Japan_·_Korea_·_USA-1F1C19)
![72 microseasons](https://img.shields.io/badge/七十二候-72_microseasons-1F1C19)

![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![tsx](https://img.shields.io/badge/tsx-unit_tests-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-e2e_tests-2EAD33?logo=playwright&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deployment-000000?logo=vercel&logoColor=white)

</div>

---

## What works today

- **Sign in or explore** — Google or an email link (Supabase), or explore without an account: start your own
  field on this phone, or look around a demo family's field (Sam & Rosie in De Pijp, Amsterdam). A guest's field
  moves into their account when they sign in.
- **Onboarding** — where you'll grow, how much sun, where you are (town search or "use my location", named
  from your rough area, with the weather now and your climate from 30 years of history), who you grow for, how
  experienced you are, and a first-season plan of gentle plants that can start now.
- **Home** — the local season ("Late autumn · first frosts") with Japan's microseason beneath, the weather and
  what it means today, frost / heat / rain notices, today's small jobs, your spaces and what's ready soon.
- **Spaces** — add a balcony, windowsill, rack, backyard or greenhouse (ensō compass, three-times sun check,
  size); each space shows what grows there and what it's good for now, spring and summer.
- **Plants** — search, grow guides (facts in everyday words, the month strip for your place, neighbours as
  gardeners' tradition), how-to steps, start / where and when / first three steps, edit, timeline, log a
  harvest (the 収 stamp), end of season, and when a plant doesn't make it.
- **Journal** — pages with seals (済 収 種 芽), the seed box, and "Our year in the field" with a share card drawn
  on the phone.
- **Family** — add grown-ups and children (a leaf, bean or sprout mark), names, parts and roles, take someone
  out; small jobs, who helped this week, and a kid view where children stamp their own 済.
- **Photos** — on journal pages and harvests, in matted frames on the page and the plant; shrunk and kept on
  the phone only (never uploaded, even when sharing), and in "Export my field".
- **Weather & seasons** — a seven-day forecast, "This week's sky", and the growing-year ring (local seasons
  outside, the 72 microseasons within).

- **Rack, grow-light shelf, greenhouse** — tank and feeding, light hours, vents and the outside temperature.
- **Something looks wrong?** — a photo and what you see; a free vision model picks only from each crop's curated
  problems (symptom rules without a key). Fixes gentlest first.
- **Plants for where you live** — 37 crops, from kale and courgettes to shiso, napa cabbage and komatsuna. In
  mild maritime places (UK, Netherlands, Pacific Northwest) dates are the RHS's; everywhere else they're worked
  out from your own frost dates and 30-year temperatures (UNH Extension frost weeks, Purdue minimum
  temperatures, Johnny's heat limits). Crops popular in your region (EU, Japan, Korea, USA) come first. Where
  no source covers your climate, the app says so instead of guessing.
- **For the table** — 30 family recipes (Dutch, Japanese, Korean, American and more), so nearly every crop
  reaches the table: what's ready now, what's ready soon, dishes from where you live first, what children can
  help with, and notes for vegetarian, vegan and gluten-free families.
- **Install and offline** — add it to your home screen; visited pages work offline; a quiet "new version" strip.
- **Notes** — a daily note and frost warnings, only after you allow them, never in quiet hours.
- **Settings** — units, season lead, notes, privacy, "Export my field" (a ZIP of field.json and photos) and delete.

- **Share between phones** (opt-in, signed in) — your field on your other phones and your family's; invites by
  link ("Send a link" → join), helpers or editors; the newest change wins. Photos and your street address stay
  on the phone.

- **The daily note while closed** (signed in) — an empty Web Push wakes the phone at the chosen time; it writes the note
  from its own field (jobs, and a frost line if tonight freezes).

## Run it

Needs Node 22+ and pnpm 10.

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

Without any keys the app works fully as a guest or the demo. To turn on sign-in, add a `.env.local` at the
**repo root** (see `.env.example`; it's loaded for the web app by `next.config.ts`):

```sh
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
# Optional, for photo diagnosis (server-side only):
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

Supabase (Authentication › URL Configuration): set the **Site URL** to your deployed address and add
`<your address>/auth/callback` (and `http://localhost:3000/auth/callback`) to **Redirect URLs**, or sign-in falls
back to localhost. Turn on the **Google** provider with an OAuth client whose redirect URI is
`https://<project-ref>.supabase.co/auth/v1/callback`.

For sharing between phones, run `supabase/migrations/20261126000000_uchi_sharing.sql` and
`20261128000000_uchi_family.sql` (owner changes roles / takes someone out) once in the SQL editor (or
`supabase db push`). They're safe to run again. Without it, everything works on one phone.

For the daily note while the app is closed (optional):

1. Pushes are checked every 15 minutes. `npx web-push generate-vapid-keys`; set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   `SUPABASE_SECRET_KEY` and `UCHI_CRON_SECRET` in Vercel (see `.env.example`).
2. Run `supabase/migrations/20261127000000_uchi_push.sql`; turn on the `pg_cron` and `pg_net` extensions first.
3. In the SQL editor, once:
   `select vault.create_secret('https://<your site>/api/push/tick', 'uchi_push_tick_url');`
   `select vault.create_secret('<UCHI_CRON_SECRET>', 'uchi_cron_secret');`

Without these, notes still arrive while the app is open.

Vercel: set the root directory to `apps/web`, add the two `NEXT_PUBLIC_SUPABASE_*` variables, and
`ENABLE_EXPERIMENTAL_COREPACK=1` so the pinned pnpm is used.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | The web app in development |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript, across the workspace |
| `pnpm check` | Lint, typecheck and build in one go |
| `pnpm test` | Unit tests (content package and web) |
| `pnpm e2e:install` · `pnpm test:e2e` | Install Playwright's browser · browser tests (phone and desktop, light and dark; build first) |

## Where your data goes

- Your field lives **on your device** (IndexedDB), one database per person. Signing in doesn't upload it. Only
  if you turn on sharing (or invite someone) is it copied to Supabase, readable only by your family (row level
  security); photos and the street address are never uploaded. Deleting your account removes the shared copy
  when no one else is in it.
- Your location is rounded to about a kilometre before it's used: to name your neighbourhood (OpenStreetMap),
  fetch the weather and your climate history (Open-Meteo). It isn't stored on any server unless you share your
  field (then the rough area goes with it, for the family's weather).
- A plant photo is sent (through our server) to Groq or OpenRouter only when you ask us to look at it; we don't
  keep it.
- The daily note while closed: our server keeps the browser's push address and keys, linked to the account, with
  the time, time zone and last day sent; the push carries nothing from your field.
- The share card is drawn on your phone; nothing is uploaded. Export gives you everything as a ZIP.

## Layout

```
apps/web/              Next.js app (App Router)
  src/app/             routes: (app)/ screens, sign-in, start/ onboarding, auth/callback, dev/kit
  src/components/ui/   Washi & Sumi primitives (ensō, seals, notices, sheet, step view…)
  src/components/      screens, onboarding, auth
  src/lib/             data layer (Dexie repo, hooks, provider), weather, seasons, plans, rules
packages/content/      curated, sourced content: crops (RHS, UNH, Johnny's) and their timing engine, recipes,
                       the 72 microseasons, local seasons
supabase/migrations/   sharing between phones: tables, row level security, invites, account deletion
```

Growing advice comes only from curated data with sources (each crop cites its pages); when we don't know, the
app says less. Companion pairs are marked as gardeners' tradition.

## Design

The Washi & Sumi designs live in `design_export/washi-sumi/` (kept locally, never committed). `CLAUDE.md` has
the design system, the season rules and the project rules; `/dev/kit` shows every primitive in light and dark.
