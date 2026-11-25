/**
 * The year's share card (14), drawn on the phone to a PNG: washi, an ensō,
 * the 収 seal, the family's line. Nothing is uploaded; sharing uses the
 * phone's own share sheet, or a download where that isn't available.
 */

function fontOf(selector: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const el = document.querySelector(selector);
  return el ? getComputedStyle(el).fontFamily : fallback;
}

/** Wraps text to a width; returns the lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > width && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawShareCard(opts: { title: string; line: string; footer: string; dark?: boolean }): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const ink = "#1F1C19";
  const soft = "#5A544C";
  const mincho = fontOf(".font-mincho", "serif");
  const gothic = fontOf("body", "sans-serif");
  await document.fonts?.ready;

  // Washi, with a quiet grain.
  ctx.fillStyle = "#F4F0E6";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(80,64,40,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
  }
  // A card-paper mat and a thin rule.
  ctx.fillStyle = "#FAF7F0";
  ctx.fillRect(70, 70, W - 140, H - 140);
  ctx.strokeStyle = "#D9D2C3";
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, W - 140, H - 140);

  // The ensō, almost closed.
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(W / 2, 420, 190, (-80 * Math.PI) / 180, ((-80 + 330) * Math.PI) / 180);
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(W / 2 + 5, 414, 174, (-68 * Math.PI) / 180, ((-68 + 290) * Math.PI) / 180);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The 収 seal, tilted.
  ctx.save();
  ctx.translate(W / 2 + 150, 560);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.fillStyle = "#B83A26";
  ctx.beginPath();
  ctx.roundRect(-70, -70, 140, 140, 10);
  ctx.fill();
  ctx.fillStyle = "#F4F0E6";
  ctx.font = `92px ${mincho}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("収", 0, 6);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink;
  ctx.font = `64px ${mincho}`;
  let y = 800;
  for (const l of wrap(ctx, opts.title, W - 260)) {
    ctx.fillText(l, W / 2, y);
    y += 80;
  }
  ctx.fillStyle = "#3D3832";
  ctx.font = `38px ${gothic}`;
  y += 20;
  for (const l of wrap(ctx, opts.line, W - 280)) {
    ctx.fillText(l, W / 2, y);
    y += 58;
  }
  ctx.fillStyle = soft;
  ctx.font = `30px ${gothic}`;
  ctx.fillText(opts.footer, W / 2, H - 130);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

/** Shares the card with the phone's share sheet, or downloads it. */
export async function shareCard(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (e) {
      // The person closed the share sheet: leave it. Anything else (e.g. the tap's permission ran out
      // while drawing): fall through and save the picture instead.
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
