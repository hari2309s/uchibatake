import { Suspense } from "react";
import { JournalEditRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <JournalEditRoute params={params} />
    </Suspense>
  );
}
