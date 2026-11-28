import { Suspense } from "react";
import { ShelterSetup } from "@/components/screens/grow";
import { PageLoader } from "@/components/ui/page-loader";

/** MC02–MC05: set up a warm spot (?space=<id> starts at that space). */
export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ShelterSetup />
    </Suspense>
  );
}
