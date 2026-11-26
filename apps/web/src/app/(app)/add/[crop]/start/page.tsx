import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { StartRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ crop: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <StartRoute params={params} step="start" />
    </Suspense>
  );
}
