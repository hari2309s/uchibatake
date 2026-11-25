import { Suspense } from "react";
import { GrowGuideRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <GrowGuideRoute params={params} />
    </Suspense>
  );
}
