import { Suspense } from "react";
import { RecipeRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <RecipeRoute params={params} />
    </Suspense>
  );
}
