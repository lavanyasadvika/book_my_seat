package com.seatsync.dto.booking;

import com.seatsync.domain.Seat;

import java.math.BigDecimal;

public record BookingSeatSummary(
        Long seatId,
        String rowLabel,
        Integer seatNumber,
        String category,
        BigDecimal price
) {
    public static BookingSeatSummary from(Seat seat) {
        return new BookingSeatSummary(seat.getId(), seat.getRowLabel(), seat.getSeatNumber(),
                seat.getCategory(), seat.getPrice());
    }
}
