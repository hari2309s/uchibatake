import { Suspense } from "react";
import { NoticeRoute } from "@/components/screens/routes";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <NoticeRoute params={params} />
    </Suspense>
  );
}
