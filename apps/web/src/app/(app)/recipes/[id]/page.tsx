import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { RecipeRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <RecipeRoute params={params} />
    </Suspense>
  );
}
