import { SYNCED_TABLES, type FieldDB } from "./data/db";
import { getSettings } from "./data/repo";

/*
 * "Export my field" (M17): everything on this phone, as one ZIP made here:
 * field.json (every row, settings) and photos/ (the original images).
 * A tiny ZIP writer (stored, no compression), so no extra dependency.
 */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A ZIP (stored) of the given files. */
export function zip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, f.data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, time, true);
    cen.setUint16(14, date, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, f.data.length, true);
    cen.setUint32(24, f.data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: "application/zip" });
}

export async function exportField(db: FieldDB): Promise<Blob> {
  const data: Record<string, unknown> = { exported_at: new Date().toISOString(), format: "uchibatake-field-1", settings: await getSettings(db) };
  const files: { name: string; data: Uint8Array }[] = [];
  for (const t of SYNCED_TABLES) {
    // What the family has now: soft-deleted rows (and their photos) stay out.
    const rows = (await db[t].toArray()).filter((r) => !(r as { deleted_at: number | null }).deleted_at);
    if (t === "photos") {
      // The images go in photos/; the rows point at them instead of carrying the bytes.
      data.photos = rows.map((p) => {
        const rest: Record<string, unknown> = { ...(p as unknown as Record<string, unknown>) };
        delete rest.blob;
        return { ...rest, file: `photos/${rest.id}.${String(rest.mime).split("/")[1] ?? "jpg"}` };
      });
      for (const p of rows as unknown as { id: string; mime: string; blob: Blob }[]) files.push({ name: `photos/${p.id}.${p.mime.split("/")[1] ?? "jpg"}`, data: new Uint8Array(await p.blob.arrayBuffer()) });
    } else data[t] = rows;
  }
  files.unshift({ name: "field.json", data: new TextEncoder().encode(JSON.stringify(data, null, 2)) });
  return zip(files);
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
