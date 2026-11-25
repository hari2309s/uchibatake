import { Suspense } from "react";
import { EditPlantRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <EditPlantRoute params={params} />
    </Suspense>
  );
}
