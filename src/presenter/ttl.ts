import type { SecurityProfile } from "../core/envelope";

export const TTL_PRESETS = [8, 12, 24, 36, 168] as const;
export const DEFAULT_TTL = 36;
export type TtlChoice = number | "custom";

export function resolveTtlHours(
  profile: SecurityProfile,
  choice: TtlChoice,
  customHours: string,
): number | null {
  if (profile === "standard") return null;
  if (choice === "custom") {
    const n = Number(customHours);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL;
  }
  return choice;
}
