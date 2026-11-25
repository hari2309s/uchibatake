import type { Metadata } from "next";
import { LinkSent } from "@/components/auth/link-sent";

export const metadata: Metadata = { title: "Check your email · Uchibatake" };

export default function Page() {
  return <LinkSent />;
}
