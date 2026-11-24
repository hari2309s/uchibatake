"use client";

import { Problem } from "@/components/ui/problem";
import { THEME_SCRIPT } from "@/lib/theme";
import { fontClasses } from "./fonts";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className={fontClasses} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="washi min-h-dvh antialiased">
        <Problem onRetry={reset} />
      </body>
    </html>
  );
}
