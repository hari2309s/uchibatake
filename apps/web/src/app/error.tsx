"use client";

import { Problem } from "@/components/ui/problem";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Problem onRetry={reset} />;
}
