import { Suspense } from "react";
import { PlantRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <PlantRoute params={params} />
    </Suspense>
  );
}
