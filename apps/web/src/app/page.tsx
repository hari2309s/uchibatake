import Link from "next/link";
import { Column } from "@/components/ui/shell";
import { Enso } from "@/components/ui/enso";

/** Placeholder until Home is built in Phase 4. */
export default function Page() {
  return (
    <Column className="items-center justify-center gap-6 px-8 text-center">
      <Enso value={12} size={120} />
      <h1 className="font-mincho text-[40px] font-normal">Uchibatake</h1>
      <p className="text-[17px] text-ink-body">Grow a little food for the people you love — on a balcony, a windowsill, wherever you are.</p>
      <Link href="/dev/kit" className="min-h-11 text-[16px] text-ink-soft underline underline-offset-4">
        The design kit
      </Link>
    </Column>
  );
}
