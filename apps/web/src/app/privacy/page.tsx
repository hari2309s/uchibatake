import type { Metadata } from "next";
import { BackBar } from "@/components/ui/bars";
import { Column } from "@/components/ui/shell";

export const metadata: Metadata = { title: "Privacy · Uchibatake" };

const LINES: [string, string][] = [
  ["Your field stays on your phone", "Spaces, plants, jobs, harvests, the journal, seeds and photos are kept on this device (in the browser's own storage), one field per person. Signing in doesn't upload them."],
  ["Sharing between phones", "Only if you turn it on (Settings, or by inviting someone): your field is copied to our server (Supabase) so your other phones and the family you invite can open it. That includes your rough area (about a kilometre) and your place name. Photos and your street address are never uploaded. Deleting your account removes the shared copy if no one else is in it."],
  ["Signing in", "If you sign in, Supabase handles it (Google or an email link). They know your email address and name; nothing from your field is sent to them unless you turn on sharing."],
  ["Your location", "If you use your phone's location, it's rounded to about a kilometre first. That rough area is sent to OpenStreetMap to name your neighbourhood, and to Open-Meteo for your weather and 30 years of climate history. If you type a town instead, those words are sent to Open-Meteo to find it. We don't keep it on a server, unless you share your field: then the rough area goes with it, so the family's weather matches. Your street address never does."],
  ["Plant photos", "Only if you ask us to look at one, that photo is sent through our server to an AI service (Groq or OpenRouter) to read it. We don't keep it; their own rules apply. Other photos never leave your phone."],
  ["Notes", "Notes are made on your phone from your own field, and only after you allow them."],
  ["The share card", "Drawn on your phone. Nothing is uploaded unless you share it yourself."],
  ["Taking it with you", "Settings › Export my field gives you everything as a ZIP: a field.json and your photos."],
];

/** Plain statements, each true of the code. */
export default function Page() {
  return (
    <Column className="page-enter pb-10">
      <BackBar href="/settings" label="Settings" />
      <h1 className="px-8 pt-2 font-mincho text-[34px] font-normal">Privacy</h1>
      <dl className="flex flex-col px-8 pt-4">
        {LINES.map(([t, d], i) => (
          <div key={t} className="rise flex flex-col gap-1.5 border-t border-rule py-4 last:border-b" style={{ "--i": i } as React.CSSProperties}>
            <dt className="font-mincho text-[20px]">{t}</dt>
            <dd className="text-[17px] leading-[1.6] text-ink-body">{d}</dd>
          </div>
        ))}
      </dl>
    </Column>
  );
}
