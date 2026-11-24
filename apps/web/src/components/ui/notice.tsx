"use client";

import Link from "next/link";
import { Button } from "./button";
import { CloseButton } from "./bars";
import { cn } from "./cn";
import { Seal } from "./seal";

/** Notice marks: urgent by size and weight, never by colour. */
export type NoticeKind = "frost" | "heat" | "rain";
export const NOTICE_KANJI: Record<NoticeKind, string> = { frost: "霜", heat: "暑", rain: "雨" };
const NOTICE_WORD: Record<NoticeKind, string> = { frost: "Frost", heat: "Heat", rain: "Heavy rain" };

/** Notice row (13a, S04 frost): 5px sumi top rule, 34px kanji, title + line, chevron. */
export function NoticeRow({ kind, title, detail, href }: { kind: NoticeKind; title: string; detail: string; href?: string }) {
  const body = (
    <>
      <span aria-hidden className="flex-none font-mincho text-[34px] leading-none">
        {NOTICE_KANJI[kind]}
      </span>
      <span className="flex flex-1 flex-col gap-[3px]">
        <span className="font-mincho text-[21px]">
          <span className="sr-only">{NOTICE_WORD[kind]} notice: </span>
          {title}
        </span>
        <span className="text-[16px] text-ink-soft">{detail}</span>
      </span>
      {href ? (
        <span aria-hidden className="text-[22px]">
          ›
        </span>
      ) : null}
    </>
  );
  const cls = "flex items-center gap-4 border-t-[5px] border-b border-t-ink border-b-rule py-4";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export interface NoticeItem {
  id: string;
  text: string;
  done: boolean;
}

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const numeral = (i: number) => NUMERALS[i] ?? String(i + 1);

/**
 * Full-screen notice. Frost (13b): moon-and-ensō drawing beside a vertical 霜,
 * a 44px title, a checklist whose boxes stamp 済. Heat and rain (C03, C04): the
 * kanji at 170px, one heavy rule, 一二三 numbered jobs with tick boxes.
 */
export function FullNotice({
  kind,
  dateLine,
  title,
  body,
  listHeading,
  items,
  onToggle,
  primary,
  secondary,
  closeHref,
  onClose,
}: {
  kind: NoticeKind;
  dateLine?: string;
  title: string;
  body: string;
  listHeading?: string;
  items: NoticeItem[];
  onToggle: (id: string) => void;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
  /** Where ✕ goes, or a handler when the notice is an overlay on the same route. */
  closeHref?: string;
  onClose?: () => void;
}) {
  const frost = kind === "frost";
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-12 justify-end px-5">
        <CloseButton href={onClose ? undefined : closeHref} onClick={onClose} />
      </div>
      {frost ? (
        <div className="flex items-start gap-5 px-8 pt-1">
          <svg width="118" height="118" aria-hidden className="block flex-none">
            <circle cx="59" cy="59" r="48" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" strokeDasharray="250 400" transform="rotate(-40 59 59)" />
            <circle cx="74" cy="44" r="13" fill="var(--ink)" />
            <circle cx="80" cy="40" r="11" fill="var(--washi)" />
          </svg>
          <span aria-hidden className="vertical font-mincho text-[44px] leading-none">
            {NOTICE_KANJI[kind]}
          </span>
        </div>
      ) : null}
      <div className={cn("flex flex-col px-8", frost ? "gap-2.5 pt-[18px]" : "gap-[18px] pt-1")}>
        {dateLine ? <span className="text-[16px] text-ink-soft">{dateLine}</span> : null}
        {!frost ? (
          <span aria-hidden className="font-mincho text-[170px] leading-[.95]">
            {NOTICE_KANJI[kind]}
          </span>
        ) : null}
        <h1 className={cn("font-mincho font-normal", frost ? "text-[44px] leading-[1.05]" : "text-[32px] leading-[1.2]")}>
          <span className="sr-only">{NOTICE_WORD[kind]} notice: </span>
          {title}
        </h1>
        <p className={cn(frost ? "text-[18px] leading-normal" : "text-[17px] leading-[1.55] text-ink-body")}>{body}</p>
      </div>
      {listHeading ? <h2 className="px-8 pt-6 font-mincho text-[21px] font-normal">{listHeading}</h2> : null}
      <ul className={cn("flex flex-col", frost ? "px-8 pt-2" : "mx-8 mt-[18px] border-t-[2.5px] border-ink")}>
        {items.map((it, i) => (
          <li key={it.id} className={cn("border-rule", frost ? "border-t last:border-b" : "border-b")}>
            <label className={cn("flex cursor-pointer items-center gap-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink", frost ? "min-h-[70px]" : "min-h-16")}>
              <input type="checkbox" className="sr-only" checked={it.done} onChange={() => onToggle(it.id)} />
              {frost ? (
                <span className="flex h-11 w-11 flex-none items-center justify-center">
                  {it.done ? <Seal kind="済" size={34} press /> : <span aria-hidden className="h-8 w-8 rounded-[3px] border-2 border-ink" />}
                </span>
              ) : (
                <span aria-hidden className="w-[26px] flex-none font-mincho text-[22px]">
                  {numeral(i)}
                </span>
              )}
              <span className={cn("flex-1 text-[17px] leading-[1.4]", it.done ? "text-ink-soft" : frost && "font-medium")}>{it.text}</span>
              {!frost ? (
                <span className="flex h-11 w-11 flex-none items-center justify-center">
                  {it.done ? <Seal kind="済" size={28} press /> : <span aria-hidden className="h-[26px] w-[26px] border-[1.5px] border-ink" />}
                </span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
      {frost ? (
        <div className="mt-auto grid grid-cols-2 gap-2.5 px-6 pb-[30px] pt-6">
          <Button variant="outline" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
          <Button onClick={primary.onClick}>{primary.label}</Button>
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[26px] pt-6">
          <Button onClick={primary.onClick}>{primary.label}</Button>
          <button type="button" onClick={secondary.onClick} className="min-h-11 text-[16px] text-ink-soft">
            {secondary.label}
          </button>
        </div>
      )}
    </div>
  );
}
