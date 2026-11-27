"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/data/provider";
import { preparePhoto, type NewPhoto } from "@/lib/photos";
import { PhotoSlot } from "./field";

/** Object URLs for blobs, made with them (no frame pointing at a revoked URL), revoked once replaced. */
export function useBlobUrls(blobs: (Blob | undefined)[]): (string | undefined)[] {
  const urls = useMemo(() => blobs.map((b) => (b ? URL.createObjectURL(b) : undefined)), [blobs]);
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
  return urls;
}

/** The saved photos with these ids, in order (missing ones skipped). */
export function usePhotos(ids: string[]): { id: string; url?: string; width: number; height: number }[] {
  const { db } = useData();
  const key = ids.join(",");
  const rows = useLiveQuery(async () => (key ? (await db.photos.bulkGet(key.split(","))).filter((p) => !!p && !p.deleted_at) : []), [db, key]);
  // Only new photos make new URLs: other writes to the table return equal rows, so the list key stays the same.
  const rowKey = (rows ?? []).map((r) => r!.id).join(",");
  const blobs = useMemo(() => (rows ?? []).map((r) => r!.blob), [rowKey]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed by photo ids
  const urls = useBlobUrls(blobs);
  return (rows ?? []).map((r, i) => ({ id: r!.id, url: urls[i], width: r!.width, height: r!.height }));
}

/** A photo chosen in a form: already saved (id) or new (not saved until the form is). */
export type PickedPhoto = { key: string; id?: string; photo?: NewPhoto };

/**
 * "+ photo" (12, 06a): the phone's own chooser (take one or pick one), then
 * matted thumbnails with a way to take each off again.
 */
export function PhotoPicker({ value, onChange, max = 6 }: { value: PickedPhoto[]; onChange: (v: PickedPhoto[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saved = usePhotos(value.filter((v) => v.id).map((v) => v.id!));
  const fresh = useMemo(() => value.map((v) => v.photo?.blob), [value]);
  const freshUrls = useBlobUrls(fresh);
  const urlOf = (v: PickedPhoto, i: number) => (v.id ? saved.find((s) => s.id === v.id)?.url : freshUrls[i]);

  // The list as it is now, for after the photos are prepared (one may be taken off meanwhile).
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });

  const pick = async (el: HTMLInputElement) => {
    const files = [...(el.files ?? [])].slice(0, max - latest.current.length);
    el.value = ""; // the same photo can be chosen again
    if (!files.length) return;
    setBusy(true);
    setNote(null);
    const added: PickedPhoto[] = [];
    for (const f of files) {
      try {
        added.push({ key: crypto.randomUUID(), photo: await preparePhoto(f) });
      } catch {
        setNote("We couldn't open one of those photos. Try another.");
      }
    }
    setBusy(false);
    if (added.length) onChange([...latest.current, ...added].slice(0, max));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {value.map((v, i) => {
          const url = urlOf(v, i);
          return (
            <div key={v.key} className="pop relative h-[72px] w-[72px] flex-none border border-rule bg-card p-1">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- on-device Blob URLs
                <img src={url} alt="" className="block h-full w-full object-cover" style={{ filter: "contrast(.92) saturate(.85) sepia(.08) brightness(1.03)" }} />
              ) : (
                <div className="hatch h-full w-full" />
              )}
              <button type="button" aria-label={`Take photo ${i + 1} off`} onClick={() => onChange(value.filter((x) => x.key !== v.key))} className="tap absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center">
                <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[15px] leading-none text-on-ink">
                  ×
                </span>
              </button>
            </div>
          );
        })}
        {value.length < max ? <PhotoSlot onPick={() => input.current?.click()} label={busy ? "…" : "+ photo"} /> : null}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void pick(e.currentTarget)} />
      {note ? (
        <p role="status" className="text-[15px] text-ink-soft">
          {note}
        </p>
      ) : null}
    </div>
  );
}
