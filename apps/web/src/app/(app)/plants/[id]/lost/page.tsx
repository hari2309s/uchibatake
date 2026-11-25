import { Suspense } from "react";
import { LostRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <LostRoute params={params} />
    </Suspense>
  );
}
