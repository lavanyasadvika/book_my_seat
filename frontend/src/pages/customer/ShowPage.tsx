import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSeatMap, getShow } from '../../api/browse'
import { checkout, confirmPayment, lockSeats } from '../../api/booking'
import { apiErrorMessage, conflictingSeatIds } from '../../api/client'
import type { BookingResponse, SeatResponse, ShowResponse } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { CountdownTimer } from '../../components/CountdownTimer'
import { ErrorBanner, LoadingSpinner } from '../../components/Feedback'
import { SeatMap } from '../../components/SeatMap'
import { useSeatSocket } from '../../ws/useSeatSocket'

type Stage = 'selecting' | 'held' | 'paying' | 'done'

export function ShowPage() {
  const { showId } = useParams()
  const id = Number(showId)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [show, setShow] = useState<ShowResponse | null>(null)
  const [seats, setSeats] = useState<SeatResponse[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [stage, setStage] = useState<Stage>('selecting')
  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getShow(id), getSeatMap(id)])
      .then(([s, seatMap]) => {
        setShow(s)
        setSeats(seatMap)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this show')))
  }, [id])

  useSeatSocket(id, (seatId, status) => {
    setSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, status } : s)))
  })

  const total = useMemo(
    () => seats.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.price, 0),
    [seats, selected],
  )

  function toggleSeat(seat: SeatResponse) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(seat.id)) next.delete(seat.id)
      else next.add(seat.id)
      return next
    })
  }

  async function refreshSeats() {
    try {
      setSeats(await getSeatMap(id))
    } catch {
      // best-effort refresh; WS/manual retry will catch up
    }
  }

  async function handleLock() {
    setError(null)
    setBusy(true)
    try {
      const result = await lockSeats(id, [...selected])
      setBooking(result)
      setStage('held')
    } catch (err) {
      const conflicts = new Set(conflictingSeatIds(err))
      if (conflicts.size > 0) {
        setSelected((prev) => new Set([...prev].filter((seatId) => !conflicts.has(seatId))))
        await refreshSeats()
        setError('Some of your selected seats were just taken by someone else. They have been deselected.')
      } else {
        setError(apiErrorMessage(err, 'Could not lock the selected seats'))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handlePayNow() {
    if (!booking) return
    setError(null)
    setBusy(true)
    try {
      const order = await checkout(booking.id)
      setStage('paying')
      const rzp = new Razorpay({
        key: order.razorpayKeyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'SeatSync',
        description: booking.eventName,
        order_id: order.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#d31642' },
        modal: { ondismiss: () => setStage('held') },
        handler: async (response) => {
          try {
            await confirmPayment(booking.id, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setStage('done')
            navigate(`/bookings/${booking.id}`, { replace: true })
          } catch (err) {
            setError(apiErrorMessage(err, 'Payment could not be confirmed'))
            setStage('held')
          }
        },
      })
      rzp.open()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start checkout'))
      setStage('held')
    } finally {
      setBusy(false)
    }
  }

  function handleHoldExpired() {
    if (stage === 'held') {
      setError('Your seat hold expired. Please select seats again.')
      setStage('selecting')
      setBooking(null)
      setSelected(new Set())
      refreshSeats()
    }
  }

  if (error && !show) return <ErrorBanner message={error} />
  if (!show) return <LoadingSpinner label="Loading seat map…" />

  return (
    <div>
      <Link to={`/events/${show.eventId}`} className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to {show.eventName}
      </Link>
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-bold text-slate-900">
          {show.eventName}
          <span className="ml-2 font-normal text-slate-400">
            {new Date(show.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </h1>
        <span className="text-xs text-slate-400">{show.venueName}</span>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <SeatMap
            seats={seats}
            selectable={stage === 'selecting'}
            selectedIds={stage === 'selecting' ? selected : new Set(booking?.seats.map((s) => s.seatId))}
            onToggle={toggleSeat}
          />
        </div>

        <aside className="h-fit space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your selection
          </h2>

          {stage === 'selecting' && (
            <>
              <p className="text-sm text-slate-600">{selected.size} seat(s) selected</p>
              <p className="text-2xl font-bold text-slate-900">₹{total.toFixed(2)}</p>
              <button
                disabled={selected.size === 0 || busy}
                onClick={handleLock}
                className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? 'Locking…' : selected.size === 0 ? 'Select seats to continue' : `Hold ${selected.size} seat(s)`}
              </button>
            </>
          )}

          {(stage === 'held' || stage === 'paying') && booking && (
            <>
              <p className="text-sm text-slate-600">{booking.seats.length} seat(s) held</p>
              <p className="text-2xl font-bold text-slate-900">₹{booking.totalAmount.toFixed(2)}</p>
              {booking.holdExpiresAt && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Hold expires in <CountdownTimer expiresAt={booking.holdExpiresAt} onExpire={handleHoldExpired} />
                </p>
              )}
              <button
                disabled={busy}
                onClick={handlePayNow}
                className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {stage === 'paying' ? 'Waiting for payment…' : 'Pay now'}
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
