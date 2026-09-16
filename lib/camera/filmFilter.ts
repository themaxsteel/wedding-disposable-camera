import type { FilmPreset } from "@/lib/types";

const PRESET_FILTER: Record<FilmPreset, string> = {
  classic: "saturate(1.12) contrast(1.08) sepia(0.10) brightness(1.02)",
  warm: "saturate(1.25) contrast(1.06) sepia(0.22) brightness(1.04) hue-rotate(-6deg)",
  bw: "grayscale(1) contrast(1.18) brightness(1.03)",
};

let grainTile: HTMLCanvasElement | null = null;

/** Tile noise dibuat sekali lalu dipakai ulang sebagai pattern. */
function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;

  const size = 128;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d")!;
  const image = ctx.createImageData(size, size);

  for (let i = 0; i < image.data.length; i += 4) {
    const v = 110 + Math.random() * 90;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grainTile = tile;
  return tile;
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.32,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.78,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawLightLeak(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  // Bocor cahaya sesekali saja — kalau setiap foto, efeknya terlihat palsu.
  if (seed > 0.35) return;

  const fromLeft = seed < 0.175;
  const gradient = ctx.createLinearGradient(fromLeft ? 0 : w, 0, fromLeft ? w * 0.55 : w * 0.45, h);
  gradient.addColorStop(0, "rgba(255,146,60,0.30)");
  gradient.addColorStop(0.35, "rgba(255,94,58,0.12)");
  gradient.addColorStop(1, "rgba(255,0,0,0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pattern = ctx.createPattern(getGrainTile(), "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawDateStamp(ctx: CanvasRenderingContext2D, w: number, h: number, when: Date) {
  const dd = String(when.getDate()).padStart(2, "0");
  const mm = String(when.getMonth() + 1).padStart(2, "0");
  const yy = String(when.getFullYear()).slice(2);
  const text = `${dd} ${mm} '${yy}`;

  const fontSize = Math.round(Math.min(w, h) * 0.042);
  const margin = Math.round(Math.min(w, h) * 0.038);

  ctx.save();
  ctx.font = `600 ${fontSize}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = "rgba(255,120,0,0.9)";
  ctx.shadowBlur = fontSize * 0.5;
  ctx.fillStyle = "rgba(255,158,64,0.92)";
  ctx.fillText(text, w - margin, h - margin);
  ctx.restore();
}

export interface FilmLookOptions {
  preset: FilmPreset;
  dateStamp?: Date | null;
  seed?: number;
}

/** Bikin versi "sudah dicuci": tone film + vignette + grain + date stamp. */
export function applyFilmLook(
  source: HTMLCanvasElement,
  { preset, dateStamp = new Date(), seed = Math.random() }: FilmLookOptions,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  const supportsFilter = "filter" in ctx;
  if (supportsFilter) ctx.filter = PRESET_FILTER[preset];
  ctx.drawImage(source, 0, 0, w, h);
  if (supportsFilter) ctx.filter = "none";

  if (preset !== "bw") drawLightLeak(ctx, w, h, seed);
  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h);
  if (dateStamp) drawDateStamp(ctx, w, h, dateStamp);

  return out;
}
