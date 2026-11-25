import { apiClient } from './client'
import type { EventResponse, SeatResponse, ShowResponse } from './types'

export function listEvents() {
  return apiClient.get<EventResponse[]>('/api/events').then((r) => r.data)
}

export function getEvent(eventId: number) {
  return apiClient.get<EventResponse>(`/api/events/${eventId}`).then((r) => r.data)
}

export function listShowsForEvent(eventId: number) {
  return apiClient.get<ShowResponse[]>(`/api/events/${eventId}/shows`).then((r) => r.data)
}

export function getShow(showId: number) {
  return apiClient.get<ShowResponse>(`/api/shows/${showId}`).then((r) => r.data)
}

export function getSeatMap(showId: number) {
  return apiClient.get<SeatResponse[]>(`/api/shows/${showId}/seats`).then((r) => r.data)
}
