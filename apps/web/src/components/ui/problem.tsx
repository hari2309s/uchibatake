"use client";

import { Button, ButtonLink } from "./button";
import { Column } from "./shell";
import { BrokenEnso } from "./enso";

/** 15d: broken ensō, calm words, no codes and no warning colours. */
export function Problem({ onRetry }: { onRetry: () => void }) {
  return (
    <Column>
      <div className="mx-auto mt-[130px]">
        <BrokenEnso />
      </div>
      <div className="flex flex-col gap-2.5 px-8 pt-[34px] text-center">
        <h1 className="font-mincho text-[32px] font-normal">Something slipped</h1>
        <p className="text-[17px] leading-[1.6] text-ink-body">This page didn&apos;t load. Nothing in your field has changed, and your plants are fine.</p>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        <Button onClick={onRetry}>Try again</Button>
        <ButtonLink href="/" variant="outline" size="sm">
          Back to Home
        </ButtonLink>
      </div>
    </Column>
  );
}
