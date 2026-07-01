export const FOUNTAIN_FPS = 8;
export const FOUNTAIN_ECC = "M" as const;
const SCALE = 0.62; // leave generous margin around the fountain QR
const MAX = 900; // px cap so it never gets absurd on large displays
export function fountainQrSize(vw: number, vh: number): number {
  return Math.min(MAX, Math.round(Math.min(vw, vh) * SCALE));
}
