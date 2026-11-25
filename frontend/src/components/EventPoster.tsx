import type { EventResponse } from '../api/types'

const GRADIENTS = [
  'from-rose-500 via-red-500 to-orange-400',
  'from-indigo-500 via-violet-500 to-purple-500',
  'from-emerald-500 via-teal-500 to-cyan-400',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-sky-500 via-blue-500 to-indigo-500',
  'from-fuchsia-500 via-pink-500 to-rose-400',
]

function pickGradient(seed: number) {
  return GRADIENTS[Math.abs(seed) % GRADIENTS.length]
}

/**
 * We have no real poster art, so events get a deterministic, distinct
 * gradient card instead - same event always renders the same "poster".
 */
export function EventPoster({ event, className = '' }: { event: EventResponse; className?: string }) {
  return (
    <div className={`relative flex items-end overflow-hidden bg-gradient-to-br ${pickGradient(event.id)} ${className}`}>
      <div className="absolute inset-0 bg-black/15" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 12px)',
        }}
      />
      {event.category && (
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
          {event.category}
        </span>
      )}
      <p className="relative z-10 p-4 font-heading text-lg font-bold leading-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]">
        {event.name}
      </p>
    </div>
  )
}
