import { Suspense } from "react";
import { StartRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ crop: string }> }) {
  return (
    <Suspense>
      <StartRoute params={params} step="start" />
    </Suspense>
  );
}
