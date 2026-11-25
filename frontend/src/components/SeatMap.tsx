import type { SeatResponse } from '../api/types'

interface SeatMapProps {
  seats: SeatResponse[]
  selectable?: boolean
  selectedIds?: Set<number>
  onToggle?: (seat: SeatResponse) => void
}

interface CategoryStyle {
  bg: string
  border: string
  text: string
  dot: string
}

const CATEGORY_PALETTE: CategoryStyle[] = [
  { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700', dot: 'bg-sky-400' },
  { bg: 'bg-gold-300/30', border: 'border-gold-500', text: 'text-amber-800', dot: 'bg-gold-500' },
  { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', dot: 'bg-violet-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', dot: 'bg-cyan-400' },
]

function categoryStyle(category: string): CategoryStyle {
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length]
}

function groupByRow(seats: SeatResponse[]): [string, SeatResponse[]][] {
  const map = new Map<string, SeatResponse[]>()
  for (const seat of seats) {
    const row = map.get(seat.rowLabel) ?? []
    row.push(seat)
    map.set(seat.rowLabel, row)
  }
  return [...map.entries()]
}

function seatClasses(seat: SeatResponse, selected: boolean, selectable: boolean) {
  if (selected) return 'bg-brand-600 text-white border-brand-700 shadow-sm shadow-brand-600/30'
  if (seat.status === 'BOOKED') return 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
  if (seat.status === 'LOCKED') return 'bg-amber-100 text-amber-600 border-amber-300 cursor-not-allowed'
  const style = categoryStyle(seat.category)
  return `${style.bg} ${style.text} ${style.border} ${
    selectable ? 'cursor-pointer hover:brightness-95' : ''
  }`
}

export function SeatMap({ seats, selectable = false, selectedIds, onToggle }: SeatMapProps) {
  const rows = groupByRow(seats)

  if (seats.length === 0) {
    return <p className="text-sm text-slate-500">No seats to show.</p>
  }

  const categories = [...new Map(seats.map((s) => [s.category, s.price])).entries()]

  return (
    <div className="space-y-5">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto h-2 w-full rounded-[50%] bg-gradient-to-r from-transparent via-slate-300 to-transparent [box-shadow:0_8px_16px_-4px_rgba(100,116,139,0.5)]" />
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">All eyes this way</p>
      </div>

      <div className="space-y-1.5 overflow-x-auto pb-2">
        {rows.map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="flex items-center justify-center gap-1.5">
            <span className="w-5 shrink-0 text-xs font-medium text-slate-400">{rowLabel}</span>
            <div className="flex gap-1.5">
              {rowSeats.map((seat) => {
                const isSelected = selectedIds?.has(seat.id) ?? false
                const canClick = selectable && seat.status === 'AVAILABLE'
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={!canClick}
                    onClick={() => canClick && onToggle?.(seat)}
                    title={`${seat.rowLabel}${seat.seatNumber} · ${seat.category} · ₹${seat.price}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-t-md rounded-b border text-[10px] font-medium transition-all ${seatClasses(seat, isSelected, selectable)}`}
                  >
                    {seat.seatNumber}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
        {categories.map(([category, price]) => (
          <Legend key={category} swatch={`${categoryStyle(category).dot}`} rounded label={`${category} · ₹${price}`} />
        ))}
        <Legend swatch="bg-brand-600" rounded label="Selected" />
        <Legend swatch="bg-amber-300" rounded label="Locked" />
        <Legend swatch="bg-slate-300" rounded label="Booked" />
      </div>
    </div>
  )
}

function Legend({ swatch, label, rounded }: { swatch: string; label: string; rounded?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 ${rounded ? 'rounded-full' : 'rounded'} ${swatch}`} />
      {label}
    </span>
  )
}
