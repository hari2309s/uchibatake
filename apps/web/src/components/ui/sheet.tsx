"use client";

import { useEffect, useRef } from "react";
import { CloseButton } from "./bars";

/**
 * Bottom sheet (06a/06b, M03, M17b-style confirmations). A native <dialog>
 * opened modally, so focus is trapped and Esc closes it. Washi surface with
 * an 18px top radius and a grab handle; the page dims behind it.
 */
export function Sheet({ open, onClose, title, eyebrow, children, hideClose }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; children: React.ReactNode; hideClose?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => {
        // Only report closes the parent didn't ask for (it already knows about those).
        if (openRef.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className="washi fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[18px] p-0 text-ink backdrop:bg-scrim"
    >
      <div className="flex min-h-full flex-col">
        <div className="flex justify-center pt-2" aria-hidden>
          <span className="h-1 w-10 rounded-[2px] bg-rule-strong" />
        </div>
        <div className="flex items-center justify-between pl-8 pr-5 pt-3">
          <div className="flex flex-col gap-1">
            {eyebrow ? <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">{eyebrow}</span> : null}
            <h2 className="font-mincho text-[28px] font-normal">{title}</h2>
          </div>
          {hideClose ? null : <CloseButton onClick={onClose} />}
        </div>
        {children}
      </div>
    </dialog>
  );
}
