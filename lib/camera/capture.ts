export const MAX_LONG_EDGE = 1920;
export const JPEG_QUALITY = 0.82;

export interface CapturedFrame {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function targetSize(w: number, h: number, maxLongEdge = MAX_LONG_EDGE) {
  const longEdge = Math.max(w, h);
  if (longEdge <= maxLongEdge) return { width: w, height: h };
  const scale = maxLongEdge / longEdge;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * Turunkan resolusi bertahap (maksimal setengah per langkah).
 * drawImage satu lompatan besar menghasilkan aliasing — wajah jadi "pecah"
 * saat foto dicetak, dan itu justru yang paling dilihat couple.
 */
function downscale(source: CanvasImageSource, sw: number, sh: number, tw: number, th: number) {
  let currentW = sw;
  let currentH = sh;
  let current: CanvasImageSource = source;

  while (currentW / 2 > tw) {
    const nextW = Math.max(tw, Math.round(currentW / 2));
    const nextH = Math.max(th, Math.round(currentH / 2));
    const step = makeCanvas(nextW, nextH);
    const stepCtx = step.getContext("2d")!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = "high";
    stepCtx.drawImage(current, 0, 0, nextW, nextH);
    current = step;
    currentW = nextW;
    currentH = nextH;
  }

  const out = makeCanvas(tw, th);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, tw, th);
  return out;
}

/** Ambil satu frame dari elemen video dan kecilkan ke maksimal 1920px sisi panjang. */
export function grabFrame(video: HTMLVideoElement): CapturedFrame {
  const sw = video.videoWidth;
  const sh = video.videoHeight;
  if (!sw || !sh) throw new Error("Video belum siap.");

  const { width, height } = targetSize(sw, sh);
  const canvas = downscale(video, sw, sh, width, height);
  return { canvas, width, height };
}

/** Jalur fallback: file dari galeri / input capture. */
export async function frameFromFile(file: File): Promise<CapturedFrame> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    const canvas = downscale(bitmap, bitmap.width, bitmap.height, width, height);
    return { canvas, width, height };
  } finally {
    bitmap.close();
  }
}

/**
 * Encode JPEG. Pakai OffscreenCanvas kalau ada — convertToBlob bekerja
 * di luar main thread sehingga viewfinder tidak nge-freeze saat menjepret.
 */
export async function toJpegBlob(
  canvas: AnyCanvas,
  quality = JPEG_QUALITY,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined" && "convertToBlob" in canvas) {
    return (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
  }

  if (typeof OffscreenCanvas !== "undefined" && canvas instanceof HTMLCanvasElement) {
    try {
      const off = new OffscreenCanvas(canvas.width, canvas.height);
      const ctx = off.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0);
        return await off.convertToBlob({ type: "image/jpeg", quality });
      }
    } catch {
      // lanjut ke toBlob biasa
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal encode JPEG."))),
      "image/jpeg",
      quality,
    );
  });
}
