import type { Metadata, Viewport } from "next";
import { fontClasses } from "./fonts";
import { ServiceWorker } from "@/components/app/sw";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uchibatake",
  description: "Grow a little food for the people you love.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F0E6" },
    { media: "(prefers-color-scheme: dark)", color: "#161412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontClasses} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="washi min-h-dvh antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
