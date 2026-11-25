import { apiClient } from './client'
import type {
  EventResponse,
  OrganizerBookingResponse,
  SeatResponse,
  ShowResponse,
  VenueResponse,
} from './types'

export interface CreateVenuePayload {
  name: string
  address: string
  seatLayout:
    | { rows: number; columns: number; defaultCategory: string }
    | { customSeats: { rowLabel: string; seatNumber: number; category: string }[] }
}

export function createVenue(payload: CreateVenuePayload) {
  return apiClient.post<VenueResponse>('/api/organizer/venues', payload).then((r) => r.data)
}

export function listVenues() {
  return apiClient.get<VenueResponse[]>('/api/organizer/venues').then((r) => r.data)
}

/** Every listed Venue, not just this Organizer's own - Venues are a shared catalog. */
export function listVenueCatalog() {
  return apiClient.get<VenueResponse[]>('/api/organizer/venues/catalog').then((r) => r.data)
}

export function createEvent(payload: { venueId: number; name: string; description?: string; category?: string }) {
  return apiClient.post<EventResponse>('/api/organizer/events', payload).then((r) => r.data)
}

export function listOrganizerEvents() {
  return apiClient.get<EventResponse[]>('/api/organizer/events').then((r) => r.data)
}

export function createShow(payload: {
  eventId: number
  startTime: string
  endTime: string
  categoryPrices: { category: string; price: number }[]
}) {
  return apiClient.post<ShowResponse>('/api/organizer/shows', payload).then((r) => r.data)
}

export function listShowsForOrganizerEvent(eventId: number) {
  return apiClient.get<ShowResponse[]>(`/api/organizer/events/${eventId}/shows`).then((r) => r.data)
}

export function viewShowSeats(showId: number) {
  return apiClient.get<SeatResponse[]>(`/api/organizer/shows/${showId}/seats`).then((r) => r.data)
}

export function viewShowBookings(showId: number) {
  return apiClient.get<OrganizerBookingResponse[]>(`/api/organizer/shows/${showId}/bookings`).then((r) => r.data)
}
