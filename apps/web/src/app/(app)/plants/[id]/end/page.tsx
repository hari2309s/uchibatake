import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { SeasonEndRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <SeasonEndRoute params={params} />
    </Suspense>
  );
}
