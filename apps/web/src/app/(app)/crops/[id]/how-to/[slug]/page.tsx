import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { HowToRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string; slug: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <HowToRoute params={params} />
    </Suspense>
  );
}
