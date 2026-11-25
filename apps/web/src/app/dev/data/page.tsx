import type { Metadata } from "next";
import { DataView } from "@/components/dev/data-view";

export const metadata: Metadata = { title: "Data · Uchibatake", robots: { index: false } };

/** The on-device data layer, live: demo or guest field, counts, today's jobs. */
export default function DataPage() {
  return <DataView />;
}
