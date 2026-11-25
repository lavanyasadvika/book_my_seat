import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvent, listShowsForEvent } from '../../api/browse'
import { apiErrorMessage } from '../../api/client'
import type { EventResponse, ShowResponse } from '../../api/types'
import { EventPoster } from '../../components/EventPoster'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function priceRange(categoryPrices: Record<string, number>) {
  const values = Object.values(categoryPrices)
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? `₹${min}` : `₹${min} – ₹${max}`
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const id = Number(eventId)
  const [event, setEvent] = useState<EventResponse | null>(null)
  const [shows, setShows] = useState<ShowResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getEvent(id), listShowsForEvent(id)])
      .then(([e, s]) => {
        setEvent(e)
        setShows(s)
        if (s.length > 0) setSelectedDate(dateKey(s[0].startTime))
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this event')))
  }, [id])

  const dateGroups = useMemo(() => {
    if (!shows) return []
    const map = new Map<string, ShowResponse[]>()
    for (const show of shows) {
      const key = dateKey(show.startTime)
      const list = map.get(key) ?? []
      list.push(show)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [shows])

  if (error) return <ErrorBanner message={error} />
  if (!event || !shows) return <LoadingSpinner label="Loading event…" />

  const activeShows = dateGroups.find(([key]) => key === selectedDate)?.[1] ?? []

  return (
    <div>
      <Link to="/events" className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to events
      </Link>

      <div className="mt-3 grid gap-6 sm:grid-cols-[220px_1fr]">
        <EventPoster event={event} className="aspect-[4/3] w-full rounded-xl sm:aspect-[3/4]" />
        <div>
          {event.category && (
            <span className="mb-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
              {event.category}
            </span>
          )}
          <h1 className="font-heading text-2xl font-bold text-slate-900">{event.name}</h1>
          <p className="mt-1 text-sm text-slate-500">at {event.venueName}</p>
          {event.description && <p className="mt-3 max-w-2xl text-sm text-slate-600">{event.description}</p>}
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-heading text-lg font-semibold text-slate-900">Showtimes</h2>
      {shows.length === 0 ? (
        <EmptyState message="No shows scheduled for this event yet." />
      ) : (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {dateGroups.map(([key, groupShows]) => {
              const date = new Date(groupShows[0].startTime)
              const isActive = key === selectedDate
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`flex shrink-0 flex-col items-center rounded-lg px-4 py-2 text-sm transition-colors ${
                    isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="font-medium">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className={isActive ? 'text-white/90' : 'text-slate-400'}>
                    {date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            {activeShows
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((show) => (
                <Link
                  key={show.id}
                  to={`/shows/${show.id}`}
                  className="group rounded-lg border border-slate-200 px-4 py-2.5 text-center transition-colors hover:border-brand-500 hover:bg-brand-50"
                >
                  <p className="font-semibold text-slate-900 group-hover:text-brand-700">
                    {new Date(show.startTime).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                  </p>
                  {priceRange(show.categoryPrices) && (
                    <p className="text-xs text-slate-500">{priceRange(show.categoryPrices)}</p>
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
