import type { FieldDB } from "./data/db";
import { create } from "./data/repo";
import type { Photo } from "./data/types";

/*
 * Family photos: shrunk on the phone (longest side 1600 px, JPEG), kept in
 * this phone's own database, never uploaded (sharing leaves photos out).
 * "Export my field" includes them.
 */

export interface NewPhoto {
  blob: Blob;
  width: number;
  height: number;
}

const MAX_SIDE = 1600;

/** A picked image, made phone-sized. Throws when the browser can't read it (some HEIC files on desktop). */
export async function preparePhoto(file: File): Promise<NewPhoto> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  c.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/jpeg", 0.85));
  return { blob, width, height };
}

/** Saves photos for something (a journal page, a harvest), in order. Returns their ids. */
export async function savePhotos(db: FieldDB, householdId: string, photos: NewPhoto[], owner: { table: Photo["owner_table"]; id: string }): Promise<string[]> {
  const ids: string[] = [];
  for (const p of photos) {
    const row = await create(db.photos, { blob: p.blob, mime: "image/jpeg", width: p.width, height: p.height, owner_table: owner.table, owner_id: owner.id }, householdId);
    ids.push(row.id);
  }
  return ids;
}

/** Removes photos for good (they're only on this phone, so nothing to keep for sharing). */
export async function deletePhotos(db: FieldDB, ids: string[]): Promise<void> {
  if (ids.length) await db.photos.bulkDelete(ids);
}
