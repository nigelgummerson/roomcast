import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost" | "danger";
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--rc-accent)] text-white hover:bg-[var(--rc-accent-hover)]",
  ghost: "bg-black/[0.06] text-slate-800 hover:bg-black/[0.1]",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

// Shared with any element that needs button styling without being a
// `<button>` — e.g. an `<a>` CTA, where nesting a real button inside would
// be invalid HTML.
export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: { variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
