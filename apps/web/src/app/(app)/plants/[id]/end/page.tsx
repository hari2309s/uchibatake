import { Suspense } from "react";
import { SeasonEndRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <SeasonEndRoute params={params} />
    </Suspense>
  );
}
