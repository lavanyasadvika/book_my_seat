import { useEffect, useState } from 'react'

function format(msRemaining: number): string {
  if (msRemaining <= 0) return '0:00'
  const totalSeconds = Math.floor(msRemaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Live countdown to a seat hold's expiry (FR-CUST-03). */
export function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const remaining = new Date(expiresAt).getTime() - now

  useEffect(() => {
    if (remaining <= 0) onExpire?.()
  }, [remaining <= 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const expired = remaining <= 0
  return (
    <span className={expired ? 'font-semibold text-rose-600' : 'font-semibold text-amber-600'}>
      {expired ? 'Expired' : format(remaining)}
    </span>
  )
}
