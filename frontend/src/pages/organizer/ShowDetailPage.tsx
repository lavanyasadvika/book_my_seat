import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getShow } from '../../api/browse'
import { apiErrorMessage } from '../../api/client'
import { viewShowBookings, viewShowSeats } from '../../api/organizer'
import type { OrganizerBookingResponse, SeatResponse, ShowResponse } from '../../api/types'
import { EmptyState, ErrorBanner, LoadingSpinner } from '../../components/Feedback'
import { SeatMap } from '../../components/SeatMap'
import { StatusBadge } from '../../components/StatusBadge'
import { useSeatSocket } from '../../ws/useSeatSocket'

export function ShowDetailPage() {
  const { showId } = useParams()
  const id = Number(showId)

  const [show, setShow] = useState<ShowResponse | null>(null)
  const [seats, setSeats] = useState<SeatResponse[]>([])
  const [bookings, setBookings] = useState<OrganizerBookingResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getShow(id), viewShowSeats(id), viewShowBookings(id)])
      .then(([s, seatMap, showBookings]) => {
        setShow(s)
        setSeats(seatMap)
        setBookings(showBookings)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this show')))
  }, [id])

  useSeatSocket(id, (seatId, status) => {
    setSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, status } : s)))
  })

  const summary = seats.reduce(
    (acc, seat) => {
      acc[seat.status] = (acc[seat.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  if (error && !show) return <ErrorBanner message={error} />
  if (!show) return <LoadingSpinner label="Loading show…" />

  return (
    <div>
      <Link to={`/organizer/events/${show.eventId}`} className="text-sm text-brand-600 hover:underline">
        ← Back to {show.eventName}
      </Link>
      <h1 className="mt-2 mb-4 font-heading text-xl font-bold text-slate-900">
        {show.eventName} · {new Date(show.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </h1>

      {error && <ErrorBanner message={error} />}

      <div className="mb-4 flex gap-3 text-sm">
        {(['AVAILABLE', 'LOCKED', 'BOOKED'] as const).map((s) => (
          <span key={s} className="rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-slate-200">
            {s}: <span className="font-semibold">{summary[s] ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <SeatMap seats={seats} />
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">Bookings</h2>
          {bookings.length === 0 ? (
            <EmptyState message="No bookings for this show yet." />
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{booking.customerName}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-xs text-slate-500">{booking.customerEmail}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {booking.seats.length} seat(s) · ₹{booking.totalAmount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
