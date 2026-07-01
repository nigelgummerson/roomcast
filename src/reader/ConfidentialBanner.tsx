import type { SecurityProfile } from "../core/envelope";
import { Countdown } from "./Countdown";
import { IconShield } from "../ui/icons";

export function ConfidentialBanner({
  profile, expiresAt, now,
}: { profile: SecurityProfile; expiresAt: number | null; now: number }) {
  if (profile !== "confidential") return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-10 flex items-center justify-center gap-2 bg-red-700 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm"
    >
      <IconShield size={16} className="shrink-0" />
      <span>
        CONFIDENTIAL — <Countdown expiresAt={expiresAt} now={now} /> · do not screenshot or forward
      </span>
    </div>
  );
}
