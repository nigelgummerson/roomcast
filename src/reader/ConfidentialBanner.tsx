import type { SecurityProfile } from "../core/envelope";
import { Countdown } from "./Countdown";

export function ConfidentialBanner({
  profile, expiresAt, now,
}: { profile: SecurityProfile; expiresAt: number; now: number }) {
  if (profile !== "confidential") return null;
  return (
    <div className="sticky top-0 z-10 bg-red-700 px-3 py-2 text-center text-sm font-semibold text-white">
      CONFIDENTIAL — <Countdown expiresAt={expiresAt} now={now} /> · do not screenshot or forward
    </div>
  );
}
