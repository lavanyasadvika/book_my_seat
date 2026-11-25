const COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-amber-100 text-amber-700',
  BOOKED: 'bg-slate-200 text-slate-600',
  HELD: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  INITIATED: 'bg-amber-100 text-amber-700',
  NONE: 'bg-slate-100 text-slate-500',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = COLORS[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
