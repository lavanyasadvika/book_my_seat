package com.seatsync.dto.organizer;

import com.seatsync.domain.Seat;

import java.math.BigDecimal;

public record SeatResponse(
        Long id,
        String rowLabel,
        Integer seatNumber,
        String category,
        BigDecimal price,
        String status
) {
    public static SeatResponse from(Seat seat) {
        return new SeatResponse(seat.getId(), seat.getRowLabel(), seat.getSeatNumber(),
                seat.getCategory(), seat.getPrice(), seat.getStatus().name());
    }
}
