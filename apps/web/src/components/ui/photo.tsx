import { cn } from "./cn";

/**
 * Photo frame (Fix Pass photo direction): a thin card-paper mat and rule, the
 * photo graded warm and slightly faded so it sits on washi. With no photo, an
 * ink drawing on card paper (`drawing`), or the hatched placeholder with a
 * caption saying what goes there.
 */
export function PhotoFrame({ src, alt, drawing, caption, height = 190, className }: { src?: string; alt?: string; drawing?: React.ReactNode; caption?: string; height?: number; className?: string }) {
  return (
    <figure className={cn("border border-rule bg-card p-1.5", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- on-device Blob URLs, not optimisable by next/image
        <img src={src} alt={alt ?? ""} className="block w-full object-cover" style={{ height, filter: "contrast(.92) saturate(.85) sepia(.08) brightness(1.03)" }} />
      ) : drawing ? (
        <div className="flex items-center justify-center bg-card" style={{ height }}>
          {drawing}
        </div>
      ) : (
        <div className="hatch flex items-end p-3" style={{ height }}>
          {caption ? <span className="bg-washi px-2 py-1 text-[15px] text-ink-soft">{caption}</span> : null}
        </div>
      )}
    </figure>
  );
}
