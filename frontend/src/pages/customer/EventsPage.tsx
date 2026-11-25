import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEvents } from '../../api/browse'
import { apiErrorMessage } from '../../api/client'
import type { EventResponse } from '../../api/types'
import { EventPoster } from '../../components/EventPoster'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'

export function EventsPage() {
  const [events, setEvents] = useState<EventResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load events')))
  }, [])

  const categories = useMemo(
    () => [...new Set((events ?? []).map((e) => e.category).filter((c): c is string => !!c))],
    [events],
  )

  const filtered = useMemo(() => {
    if (!events) return []
    return events.filter((e) => {
      const matchesCategory = !activeCategory || e.category === activeCategory
      const matchesQuery =
        !query.trim() ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.venueName.toLowerCase().includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [events, activeCategory, query])

  return (
    <div>
      <section className="-mx-4 -mt-6 mb-8 bg-ink-900 px-4 py-12 sm:-mx-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Book your next <span className="text-brand-500">experience</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Live shows, movies and more — pick a seat, hold it, and pay in seconds.
          </p>
          <div className="mx-auto mt-6 max-w-lg">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events or venues…"
              className="w-full rounded-full border-0 bg-white px-5 py-3 text-sm text-slate-900 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {!events && !error && <LoadingSpinner label="Loading events…" />}

      {events && (
        <>
          {categories.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === null ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState message={events.length === 0 ? 'No events published yet.' : 'Nothing matches your search.'} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <EventPoster event={event} className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <h2 className="font-heading font-semibold text-slate-900 group-hover:text-brand-600">
                      {event.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{event.venueName}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
