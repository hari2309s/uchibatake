import { notFound } from "next/navigation";
import { StartPage } from "@/components/onboarding/start-page";
import { STEPS, type Step } from "@/components/onboarding/draft";

export function generateStaticParams() {
  return STEPS.map((step) => ({ step }));
}

export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!STEPS.includes(step as Step)) notFound();
  return <StartPage step={step as Step} />;
}
