export type Role = 'ORGANIZER' | 'CUSTOMER'

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED'
export type BookingStatus = 'HELD' | 'BOOKED' | 'EXPIRED' | 'CANCELLED'
export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'NONE'

export interface AuthResponse {
  token: string
  userId: number
  name: string
  email: string
  role: Role
}

export interface VenueSeatResponse {
  id: number
  rowLabel: string
  seatNumber: number
  category: string
}

export interface VenueResponse {
  id: number
  name: string
  address: string
  createdAt: string
  seats: VenueSeatResponse[]
}

export interface EventResponse {
  id: number
  venueId: number
  venueName: string
  name: string
  description: string | null
  category: string | null
  createdAt: string
}

export interface ShowResponse {
  id: number
  eventId: number
  eventName: string
  venueId: number
  venueName: string
  startTime: string
  endTime: string
  createdAt: string
  categoryPrices: Record<string, number>
}

export interface SeatResponse {
  id: number
  rowLabel: string
  seatNumber: number
  category: string
  price: number
  status: SeatStatus
}

export interface BookingSeatSummary {
  seatId: number
  rowLabel: string
  seatNumber: number
  category: string
  price: number
}

export interface BookingResponse {
  id: number
  showId: number
  eventName: string
  status: BookingStatus
  totalAmount: number
  holdExpiresAt: string | null
  createdAt: string
  seats: BookingSeatSummary[]
  paymentStatus: PaymentStatus
}

export interface CheckoutResponse {
  bookingId: number
  razorpayOrderId: string
  razorpayKeyId: string
  amount: number
  currency: string
}

export interface OrganizerBookingResponse {
  id: number
  customerId: number
  customerName: string
  customerEmail: string
  status: BookingStatus
  totalAmount: number
  createdAt: string
  seats: BookingSeatSummary[]
}

export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  conflictingSeatIds: number[] | null
}

export interface SeatUpdateMessage {
  showId: number
  seats: { seatId: number; status: SeatStatus }[]
  timestamp: string
}
