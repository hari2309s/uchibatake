import type { Metadata } from "next";
import { Kit } from "@/components/kit/kit";

export const metadata: Metadata = { title: "Kit · Uchibatake", robots: { index: false } };

/** Every primitive, in light and dark side by side. */
export default function KitPage() {
  return <Kit />;
}
