import { Suspense } from "react";
import { TaskRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <TaskRoute params={params} />
    </Suspense>
  );
}
