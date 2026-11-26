import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StartPage } from "@/components/onboarding/start-page";
import { STEPS, type Step } from "@/components/onboarding/draft";
import { PageLoader } from "@/components/ui/page-loader";

// Only the steps there are: anything else is a real 404 (not a page that streams, then says "not found").
export const dynamicParams = false;

export function generateStaticParams() {
  return STEPS.map((step) => ({ step }));
}

/** Reads the step inside Suspense, so moving between steps never waits on a blank page. */
async function Step({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!STEPS.includes(step as Step)) notFound();
  return <StartPage step={step as Step} />;
}

export default function Page({ params }: { params: Promise<{ step: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Step params={params} />
    </Suspense>
  );
}
