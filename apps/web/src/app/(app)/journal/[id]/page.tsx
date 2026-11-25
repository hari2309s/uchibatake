import { Suspense } from "react";
import { JournalEntryRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <JournalEntryRoute params={params} />
    </Suspense>
  );
}
