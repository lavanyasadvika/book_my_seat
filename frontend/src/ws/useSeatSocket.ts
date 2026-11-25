import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL, tokenStorage } from '../api/client'
import type { SeatStatus, SeatUpdateMessage } from '../api/types'

/**
 * Subscribes to /topic/shows/{showId} for live seat-status pushes
 * (FR-WS-01/02). Purely a UI convenience layered on top of whatever the
 * initial REST fetch returned - the server's conditional UPDATE remains
 * the sole authority on seat availability (FR-WS-03), so a missed or
 * delayed message here is not a correctness problem, only a staleness one.
 */
export function useSeatSocket(showId: number | undefined, onUpdate: (seatId: number, status: SeatStatus) => void) {
  const [connected, setConnected] = useState(false)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!showId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`) as unknown as WebSocket,
      connectHeaders: {
        Authorization: `Bearer ${tokenStorage.get() ?? ''}`,
      },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/shows/${showId}`, (message) => {
          try {
            const payload = JSON.parse(message.body) as SeatUpdateMessage
            payload.seats.forEach((s) => onUpdateRef.current(s.seatId, s.status))
          } catch {
            // ignore malformed frames
          }
        })
      },
      onStompError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    })

    client.activate()

    return () => {
      setConnected(false)
      client.deactivate()
    }
  }, [showId])

  return { connected }
}
