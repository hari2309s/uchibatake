import { Suspense } from "react";
import { KidRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <KidRoute params={params} />
    </Suspense>
  );
}
