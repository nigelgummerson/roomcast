import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string };
const S = ({ size = 20, className, children }: IconProps & { children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);
export const IconCamera = (p: IconProps) => (
  <S {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></S>
);
export const IconClose = (p: IconProps) => (<S {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></S>);
export const IconBack = (p: IconProps) => (<S {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></S>);
export const IconSearch = (p: IconProps) => (<S {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></S>);
export const IconTorch = (p: IconProps) => (<S {...p}><path d="M9 2h6l-1 7 3 2-7 11 1-8H8l1-5-2-2z" /></S>);
export const IconShield = (p: IconProps) => (<S {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></S>);
export const IconChevronRight = (p: IconProps) => (<S {...p}><polyline points="9 18 15 12 9 6" /></S>);
