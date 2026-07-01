export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="RoomCast"
    >
      <rect x="6" y="14" width="28" height="24" rx="5" fill="#005EB8" />
      <g fill="none" stroke="#005EB8" strokeWidth="3" strokeLinecap="round">
        <path d="M32 16a8 8 0 0 1 8 8" />
        <path d="M32 10a14 14 0 0 1 14 14" />
      </g>
    </svg>
  );
}
