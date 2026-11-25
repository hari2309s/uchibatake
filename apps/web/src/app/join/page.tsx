import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Column } from "@/components/ui/shell";

export const metadata: Metadata = { title: "Join a family's field · Uchibatake" };

/**
 * M13 Join a family. The design shows an invite landing with roles. Joining
 * someone's field means sharing it between phones, which needs sync (still to
 * come), so this says so plainly instead of pretending to join.
 */
export default function Page() {
  return (
    <Column className="page-enter px-8 pt-24">
      <h1 className="rise font-mincho text-[32px] font-normal leading-[1.2]">Joining a family&apos;s field</h1>
      <p className="rise pt-4 text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 1 } as React.CSSProperties}>
        Sharing one field between phones is still to come. When it arrives, an invite from your family will open here, and you&apos;ll choose how you help: ticking off jobs and logging harvests, or looking after everything.
      </p>
      <p className="rise pt-3 text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 2 } as React.CSSProperties}>
        Until then, you can start a field of your own on this phone.
      </p>
      <div className="rise mt-auto flex flex-col gap-2.5 pb-[34px] pt-10" style={{ "--i": 3 } as React.CSSProperties}>
        <ButtonLink href="/">Go to Uchibatake</ButtonLink>
      </div>
    </Column>
  );
}
