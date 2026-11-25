import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { myBookings } from '../../api/booking'
import { apiErrorMessage } from '../../api/client'
import type { BookingResponse, BookingStatus } from '../../api/types'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'
import { StatusBadge } from '../../components/StatusBadge'

const FILTERS: (BookingStatus | 'ALL')[] = ['ALL', 'HELD', 'BOOKED', 'EXPIRED', 'CANCELLED']

export function BookingsPage() {
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('ALL')
  const [bookings, setBookings] = useState<BookingResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBookings(null)
    myBookings(filter === 'ALL' ? undefined : filter)
      .then(setBookings)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your bookings')))
  }, [filter])

  return (
    <div>
      <h1 className="mb-4 font-heading text-xl font-bold text-slate-900">My bookings</h1>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!error && !bookings && <LoadingSpinner />}
      {!error && bookings && bookings.length === 0 && <EmptyState message="No bookings in this category yet." />}

      {bookings && bookings.length > 0 && (
        <div className="space-y-2.5">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              to={`/bookings/${booking.id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  🎟
                </div>
                <div>
                  <p className="font-heading font-semibold text-slate-900">{booking.eventName}</p>
                  <p className="text-sm text-slate-500">
                    {booking.seats.length} seat(s) · ₹{booking.totalAmount.toFixed(2)} ·{' '}
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <StatusBadge status={booking.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
