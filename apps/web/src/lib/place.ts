/**
 * Where the field is. Coordinates are rounded to two decimals (about 1 km)
 * before they're stored or sent anywhere: only the rough area is used, to
 * fetch the weather (Open-Meteo) and choose the local seasons.
 */
export interface Place {
  /** What we call it in headers ("De Pijp", "Utrecht"). */
  name: string;
  /** A second line ("Amsterdam, Netherlands"). */
  detail: string | null;
  lat: number;
  lon: number;
  /** ISO 3166 alpha-2 ("NL", "JP"), when known: which crops are popular here. */
  country?: string | null;
}

export const roundCoord = (x: number) => Math.round(x * 100) / 100;

export function roughArea(lat: number, lon: number): { lat: number; lon: number } {
  return { lat: roundCoord(lat), lon: roundCoord(lon) };
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const AMSTERDAM = { lat: 52.37, lon: 4.9 };

/** The shipped season table for a place, if one was written for it (Amsterdam and around it). Otherwise seasons are computed from normals. */
export function seasonTableFor(area: { lat: number; lon: number }): string | null {
  return distanceKm(area, AMSTERDAM) <= 60 ? "amsterdam" : null;
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
  country_code?: string;
}

/** Town search (Open-Meteo geocoding: free, no key; only the typed text is sent). */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const text = q.trim();
  if (text.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=5&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("geocoding unavailable");
  const json = (await res.json()) as { results?: GeoResult[] };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(", ") || null,
    country: r.country_code?.toUpperCase() ?? null,
    ...roughArea(r.latitude, r.longitude),
  }));
}
