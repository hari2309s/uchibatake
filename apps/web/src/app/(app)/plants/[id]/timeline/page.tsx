import { Suspense } from "react";
import { TimelineRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <TimelineRoute params={params} />
    </Suspense>
  );
}
