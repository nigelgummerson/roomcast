export function formatRemaining(expiresAt: number, now: number): string {
  const ms = expiresAt - now;
  if (ms <= 0) return "expired";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `expires in ${h}h ${m}m`;
}

export function Countdown({ expiresAt, now }: { expiresAt: number; now: number }) {
  return <span className="tabular-nums">{formatRemaining(expiresAt, now)}</span>;
}
