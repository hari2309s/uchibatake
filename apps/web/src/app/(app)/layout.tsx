import { Suspense } from "react";
import { AppFrame } from "@/components/app/frame";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // The frame reads the path (URL data), which needs a Suspense boundary under Cache Components.
  return (
    <Suspense>
      <AppFrame>{children}</AppFrame>
    </Suspense>
  );
}
