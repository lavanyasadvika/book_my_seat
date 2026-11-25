import { apiClient } from './client'
import type { BookingResponse, BookingStatus, CheckoutResponse } from './types'

export function lockSeats(showId: number, seatIds: number[]) {
  return apiClient.post<BookingResponse>('/api/bookings/lock', { showId, seatIds }).then((r) => r.data)
}

export function myBookings(status?: BookingStatus) {
  return apiClient
    .get<BookingResponse[]>('/api/bookings/my', { params: status ? { status } : undefined })
    .then((r) => r.data)
}

export function getBooking(bookingId: number) {
  return apiClient.get<BookingResponse>(`/api/bookings/${bookingId}`).then((r) => r.data)
}

export function checkout(bookingId: number) {
  return apiClient.post<CheckoutResponse>(`/api/bookings/${bookingId}/checkout`).then((r) => r.data)
}

export function confirmPayment(
  bookingId: number,
  payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  return apiClient.post<BookingResponse>(`/api/bookings/${bookingId}/confirm`, payload).then((r) => r.data)
}
