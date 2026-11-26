import { ButtonLink } from "@/components/ui/button";
import { BrokenEnso } from "@/components/ui/enso";
import { Column } from "@/components/ui/shell";

/** A page that isn't there: same calm as 15d, no codes. */
export default function NotFound() {
  return (
    <Column className="page-enter">
      <div className="mx-auto mt-[130px]">
        <BrokenEnso />
      </div>
      <div className="flex flex-col gap-2.5 px-8 pt-[34px] text-center">
        <h1 className="font-mincho text-[32px] font-normal">Nothing grows here</h1>
        <p className="text-[17px] leading-[1.6] text-ink-body">This page isn&apos;t in your field. Your plants are where you left them.</p>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        <ButtonLink href="/">Back to Home</ButtonLink>
      </div>
    </Column>
  );
}
