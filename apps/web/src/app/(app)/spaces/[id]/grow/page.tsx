import { Suspense } from "react";
import { GrowSpaceRoute } from "@/components/screens/routes";
import { PageLoader } from "@/components/ui/page-loader";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <GrowSpaceRoute params={params} />
    </Suspense>
  );
}
