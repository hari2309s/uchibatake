import type { Metadata } from "next";
import { PageLoader } from "@/components/ui/page-loader";
import { Suspense } from "react";
import { JoinRoute } from "@/components/auth/join";

export const metadata: Metadata = { title: "Join a family's field · Uchibatake" };

export default function Page({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <JoinRoute params={params} />
    </Suspense>
  );
}
