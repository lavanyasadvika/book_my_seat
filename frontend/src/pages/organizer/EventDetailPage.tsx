import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvent } from '../../api/browse'
import { apiErrorMessage } from '../../api/client'
import { createShow, listShowsForOrganizerEvent, listVenueCatalog } from '../../api/organizer'
import type { EventResponse, ShowResponse } from '../../api/types'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'

const DEFAULT_DURATION_MS = 60 * 60 * 1000

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const id = Number(eventId)

  const [event, setEvent] = useState<EventResponse | null>(null)
  const [shows, setShows] = useState<ShowResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  // Seat categories are a property of the Venue's physical layout, not
  // something an Organizer types per Show - fetched once and used only to
  // label a price field per category, never as free text. This also removes
  // a real hazard: a mistyped category here used to silently fall back to
  // pricing every unmatched seat at the first row's price.
  const [venueCategories, setVenueCategories] = useState<string[] | null>(null)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function reload() {
    Promise.all([getEvent(id), listShowsForOrganizerEvent(id)])
      .then(([e, s]) => {
        setEvent(e)
        setShows(s)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this event')))
  }

  useEffect(reload, [id])

  useEffect(() => {
    if (!event) return
    listVenueCatalog()
      .then((venues) => {
        const venue = venues.find((v) => v.id === event.venueId)
        const categories = venue ? [...new Set(venue.seats.map((s) => s.category))] : []
        setVenueCategories(categories)
        setPrices(Object.fromEntries(categories.map((c) => [c, ''])))
      })
      .catch(() => setVenueCategories([]))
  }, [event])

  function handleStartTimeChange(value: string) {
    setStartTime(value)
    // Keep End time valid automatically: if it's unset or no longer after
    // the new Start time, bump it to Start + 1 hour. A manually-chosen
    // longer duration that's still valid is left alone. This is what
    // prevents the easy-to-make mistake of changing Start's date while
    // leaving End on the old date, which either fails validation or - worse
    // - creates a show for the wrong, unintended time window.
    const newStart = new Date(value)
    const currentEnd = endTime ? new Date(endTime) : null
    if (!value || Number.isNaN(newStart.getTime())) return
    if (!currentEnd || Number.isNaN(currentEnd.getTime()) || currentEnd <= newStart) {
      setEndTime(toLocalDatetimeValue(new Date(newStart.getTime() + DEFAULT_DURATION_MS)))
    }
  }

  const minDatetimeLocal = toLocalDatetimeValue(new Date())

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createShow({
        eventId: id,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        categoryPrices: Object.entries(prices)
          .filter(([, price]) => price)
          .map(([category, price]) => ({ category, price: Number(price) })),
      })
      setStartTime('')
      setEndTime('')
      setPrices(Object.fromEntries((venueCategories ?? []).map((c) => [c, ''])))
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create show'))
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !event) return <ErrorBanner message={error} />
  if (!event || !shows) return <LoadingSpinner label="Loading event…" />

  return (
    <div>
      <Link to="/organizer/events" className="text-sm text-brand-600 hover:underline">
        ← Back to events
      </Link>
      <h1 className="mt-2 font-heading text-xl font-bold text-slate-900">{event.name}</h1>
      <p className="mb-4 text-sm text-slate-500">at {event.venueName}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">Shows</h2>
          {error && <ErrorBanner message={error} />}
          {shows.length === 0 ? (
            <EmptyState message="No shows created for this event yet." />
          ) : (
            <div className="space-y-2">
              {shows.map((show) => (
                <Link
                  key={show.id}
                  to={`/organizer/shows/${show.id}`}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
                >
                  <span className="font-medium text-slate-900">
                    {new Date(show.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} –{' '}
                    {new Date(show.endTime).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                  </span>
                  <span className="text-sm font-medium text-brand-600">Manage →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="h-fit rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">New show</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Start time</label>
                <input
                  type="datetime-local"
                  required
                  min={minDatetimeLocal}
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">End time</label>
                <input
                  type="datetime-local"
                  required
                  min={startTime || minDatetimeLocal}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              End time defaults to an hour after Start — adjust either field freely. The
              venue must be free for the whole window, or another Organizer's show there
              will be rejected as a conflict.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Price per seat category</label>
              {venueCategories === null ? (
                <p className="text-xs text-slate-400">Loading venue's seat categories…</p>
              ) : venueCategories.length === 0 ? (
                <p className="text-xs text-rose-600">This venue has no seat categories - cannot price a show.</p>
              ) : (
                <div className="space-y-2">
                  {venueCategories.map((category) => (
                    <div key={category} className="flex items-center gap-2">
                      <span className="w-1/2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {category}
                      </span>
                      <input
                        required
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="Price (₹)"
                        value={prices[category] ?? ''}
                        onChange={(e) => setPrices((p) => ({ ...p, [category]: e.target.value }))}
                        className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-slate-400">
                Categories come from the venue's seat layout — set what you're charging per category for this show.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !venueCategories || venueCategories.length === 0}
              className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create show'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
