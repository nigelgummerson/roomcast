// Default document title for a new broadcast: "Handover YYYY-MM-DD" using the
// local date, so a handover defaults to today's date. Pure + injectable for testing.
export function defaultHandoverTitle(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `Handover ${y}-${m}-${d}`;
}
