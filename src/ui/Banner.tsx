import type { ReactNode } from "react";
const styles = {
  soft: "bg-amber-100 text-amber-900",
  hard: "bg-red-700 text-white",
} as const;
export function Banner({
  severity, children, className = "",
}: { severity: "soft" | "hard"; children: ReactNode; className?: string }) {
  const role = severity === "hard" ? "alert" : "status";
  return (
    <div role={role} className={`rounded-lg px-3 py-2 text-sm ${styles[severity]} ${className}`}>
      {children}
    </div>
  );
}
