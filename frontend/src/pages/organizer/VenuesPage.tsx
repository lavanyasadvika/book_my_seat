import { useEffect, useState, type FormEvent } from 'react'
import { createVenue, listVenues } from '../../api/organizer'
import { apiErrorMessage } from '../../api/client'
import type { VenueResponse } from '../../api/types'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'

export function VenuesPage() {
  const [venues, setVenues] = useState<VenueResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [rows, setRows] = useState(8)
  const [columns, setColumns] = useState(10)
  const [category, setCategory] = useState('STANDARD')
  const [submitting, setSubmitting] = useState(false)

  function reload() {
    listVenues()
      .then(setVenues)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load venues')))
  }

  useEffect(reload, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createVenue({
        name,
        address,
        seatLayout: { rows, columns, defaultCategory: category },
      })
      setName('')
      setAddress('')
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create venue'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 font-heading text-xl font-bold text-slate-900">Your venues</h1>
        {error && <ErrorBanner message={error} />}
        {!venues && !error && <LoadingSpinner />}
        {venues && venues.length === 0 && <EmptyState message="You haven't created any venues yet." />}
        {venues && venues.length > 0 && (
          <div className="space-y-3">
            {venues.map((venue) => (
              <div key={venue.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="font-semibold text-slate-900">{venue.name}</p>
                <p className="text-sm text-slate-500">{venue.address}</p>
                <p className="mt-1 text-xs text-slate-400">{venue.seats.length} seat(s) configured</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-fit rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">New venue</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <p className="pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">Seat layout (grid)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rows</label>
              <input
                type="number"
                min={1}
                max={26}
                required
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Columns</label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Default seat category</label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <p className="text-xs text-slate-400">
            This creates {rows} row(s) × {columns} seat(s) = {rows * columns} total seats.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create venue'}
          </button>
        </form>
      </div>
    </div>
  )
}
