import { Suspense } from "react";
import { FeedRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <FeedRoute params={params} />
    </Suspense>
  );
}
