package com.seatsync.dto.booking;

import com.seatsync.domain.Booking;
import com.seatsync.domain.Seat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BookingResponse(
        Long id,
        Long showId,
        String eventName,
        String status,
        BigDecimal totalAmount,
        Instant holdExpiresAt,
        Instant createdAt,
        List<BookingSeatSummary> seats,
        String paymentStatus
) {
    public static BookingResponse from(Booking booking, List<Seat> seats, String paymentStatus) {
        return new BookingResponse(
                booking.getId(),
                booking.getShow().getId(),
                booking.getShow().getEvent().getName(),
                booking.getStatus().name(),
                booking.getTotalAmount(),
                booking.getHoldExpiresAt(),
                booking.getCreatedAt(),
                seats.stream().map(BookingSeatSummary::from).toList(),
                paymentStatus
        );
    }
}
