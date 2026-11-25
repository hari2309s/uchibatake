import { Suspense } from "react";
import { SpaceRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <SpaceRoute params={params} />
    </Suspense>
  );
}
