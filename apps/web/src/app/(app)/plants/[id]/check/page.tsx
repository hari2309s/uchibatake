import { Suspense } from "react";
import { CheckRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <CheckRoute params={params} />
    </Suspense>
  );
}
