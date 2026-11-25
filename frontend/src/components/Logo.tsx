export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 14a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v4a4 4 0 0 0 0 12v4a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-4a4 4 0 0 0 0-12z"
      />
      <path
        stroke="white"
        strokeWidth="2"
        strokeDasharray="3 3"
        strokeLinecap="round"
        d="M24 10v4M24 20v4M24 30v4"
      />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-heading text-xl font-bold tracking-tight ${className}`}>
      Seat<span className="text-brand-500">Sync</span>
    </span>
  )
}
