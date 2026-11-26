import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Column } from "@/components/ui/shell";

export const metadata: Metadata = { title: "Join a family's field · Uchibatake" };

/** Without an invite code: how joining works. */
export default function Page() {
  return (
    <Column className="page-enter px-8 pt-24">
      <h1 className="rise font-mincho text-[32px] font-normal leading-[1.2]">Joining a family&apos;s field</h1>
      <p className="rise pt-4 text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 1 } as React.CSSProperties}>
        Ask someone in the family to send you a link from Family › Invite someone. It opens here, shows you their field, and you join with one tap.
      </p>
      <div className="rise mt-auto flex flex-col gap-2.5 pb-[34px] pt-10" style={{ "--i": 2 } as React.CSSProperties}>
        <ButtonLink href="/">Go to Uchibatake</ButtonLink>
      </div>
    </Column>
  );
}
