import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const variants: Record<Variant, string> = {
  primary: "bg-[var(--rc-accent)] text-white hover:bg-[var(--rc-accent-hover)]",
  ghost: "bg-black/[0.06] text-slate-800 hover:bg-black/[0.1]",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
