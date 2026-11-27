import { Suspense } from "react";
import { AddPlant } from "@/components/screens/add";
import { PageLoader } from "@/components/ui/page-loader";

/** Add a plant; ?space=<id> when opened from a space (it reads the address, so inside Suspense). */
export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AddPlant />
    </Suspense>
  );
}
