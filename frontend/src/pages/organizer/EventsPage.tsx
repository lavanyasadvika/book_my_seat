import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createEvent, listOrganizerEvents, listVenueCatalog } from '../../api/organizer'
import { apiErrorMessage } from '../../api/client'
import type { EventResponse, VenueResponse } from '../../api/types'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'

export function EventsPage() {
  const [events, setEvents] = useState<EventResponse[] | null>(null)
  const [venues, setVenues] = useState<VenueResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const [venueId, setVenueId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reload() {
    Promise.all([listOrganizerEvents(), listVenueCatalog()])
      .then(([e, v]) => {
        setEvents(e)
        setVenues(v)
        if (v.length > 0) setVenueId((prev) => (prev === '' ? v[0].id : prev))
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load events')))
  }

  useEffect(reload, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (venueId === '') return
    setError(null)
    setSubmitting(true)
    try {
      await createEvent({ venueId, name, description: description || undefined, category: category || undefined })
      setName('')
      setDescription('')
      setCategory('')
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create event'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 font-heading text-xl font-bold text-slate-900">Your events</h1>
        {error && <ErrorBanner message={error} />}
        {!events && !error && <LoadingSpinner />}
        {events && events.length === 0 && <EmptyState message="You haven't created any events yet." />}
        {events && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/organizer/events/${event.id}`}
                className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
              >
                <p className="font-semibold text-slate-900">{event.name}</p>
                <p className="text-sm text-slate-500">{event.venueName}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="h-fit rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">New event</h2>
        {venues.length === 0 ? (
          <p className="text-sm text-slate-500">
            No venues listed yet. <Link to="/organizer/venues" className="text-brand-600 hover:underline">List one</Link> —
            any Organizer can then host an Event there.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Venue</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.address}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Shared catalog — pick any listed venue, not just your own.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Movie, Concert"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create event'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
