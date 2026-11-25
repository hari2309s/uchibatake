import { Suspense } from "react";
import { HowToRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string; slug: string }> }) {
  return (
    <Suspense>
      <HowToRoute params={params} />
    </Suspense>
  );
}
