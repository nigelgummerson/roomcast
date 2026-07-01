import type { ReactNode } from "react";
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-black/10 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
