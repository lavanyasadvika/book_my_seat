package com.seatsync.dto.organizer;

import com.seatsync.domain.Booking;
import com.seatsync.dto.booking.BookingSeatSummary;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrganizerBookingResponse(
        Long id,
        Long customerId,
        String customerName,
        String customerEmail,
        String status,
        BigDecimal totalAmount,
        Instant createdAt,
        List<BookingSeatSummary> seats
) {
    public static OrganizerBookingResponse from(Booking booking, List<com.seatsync.domain.Seat> seats) {
        return new OrganizerBookingResponse(
                booking.getId(),
                booking.getCustomer().getId(),
                booking.getCustomer().getName(),
                booking.getCustomer().getEmail(),
                booking.getStatus().name(),
                booking.getTotalAmount(),
                booking.getCreatedAt(),
                seats.stream().map(BookingSeatSummary::from).toList()
        );
    }
}
