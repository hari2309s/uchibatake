import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { GrowGuideRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <GrowGuideRoute params={params} />
    </Suspense>
  );
}
