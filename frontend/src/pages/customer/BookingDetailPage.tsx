import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { checkout, confirmPayment, getBooking } from '../../api/booking'
import { apiErrorMessage } from '../../api/client'
import type { BookingResponse } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { CountdownTimer } from '../../components/CountdownTimer'
import { ErrorBanner, LoadingSpinner } from '../../components/Feedback'
import { StatusBadge } from '../../components/StatusBadge'

export function BookingDetailPage() {
  const { bookingId } = useParams()
  const id = Number(bookingId)
  const { user } = useAuth()

  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reload() {
    getBooking(id)
      .then(setBooking)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this booking')))
  }

  useEffect(reload, [id])

  async function handlePayNow() {
    if (!booking) return
    setError(null)
    setBusy(true)
    try {
      const order = await checkout(booking.id)
      const rzp = new Razorpay({
        key: order.razorpayKeyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'SeatSync',
        description: booking.eventName,
        order_id: order.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#d31642' },
        handler: async (response) => {
          try {
            await confirmPayment(booking.id, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            reload()
          } catch (err) {
            setError(apiErrorMessage(err, 'Payment could not be confirmed'))
          }
        },
      })
      rzp.open()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start checkout'))
    } finally {
      setBusy(false)
    }
  }

  if (error && !booking) return <ErrorBanner message={error} />
  if (!booking) return <LoadingSpinner />

  const holdActive =
    booking.status === 'HELD' && booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() > Date.now()
  const isConfirmed = booking.status === 'BOOKED'

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/bookings" className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to bookings
      </Link>

      {error && (
        <div className="my-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="relative mt-3 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
        <div className="bg-ink-900 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-lg font-bold">{booking.eventName}</h1>
              <p className="mt-0.5 text-xs text-slate-400">Booking #{booking.id}</p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </div>

        {/* perforated ticket-stub divider */}
        <div className="relative h-0 border-t-2 border-dashed border-slate-200">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
        </div>

        <div className="px-6 py-5">
          {isConfirmed && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              ✓ Payment confirmed — this booking is locked in.
            </div>
          )}

          <div className="space-y-1.5 text-sm text-slate-600">
            {booking.seats.map((seat) => (
              <div key={seat.seatId} className="flex justify-between">
                <span>
                  Seat {seat.rowLabel}
                  {seat.seatNumber} <span className="text-slate-400">· {seat.category}</span>
                </span>
                <span>₹{seat.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
            <span className="font-medium text-slate-900">Total</span>
            <span className="font-heading text-lg font-bold text-slate-900">₹{booking.totalAmount.toFixed(2)}</span>
          </div>

          <div className="mt-2 flex justify-between text-sm text-slate-500">
            <span>Payment</span>
            <StatusBadge status={booking.paymentStatus} />
          </div>

          {holdActive && booking.holdExpiresAt && (
            <div className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Hold expires in <CountdownTimer expiresAt={booking.holdExpiresAt} onExpire={reload} /> — complete
              payment before it lapses.
            </div>
          )}

          {holdActive && (
            <button
              disabled={busy}
              onClick={handlePayNow}
              className="mt-4 w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? 'Starting checkout…' : 'Pay now'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
