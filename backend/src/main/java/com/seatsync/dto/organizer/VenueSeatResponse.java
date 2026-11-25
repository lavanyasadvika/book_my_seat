package com.seatsync.dto.organizer;

import com.seatsync.domain.VenueSeat;

public record VenueSeatResponse(
        Long id,
        String rowLabel,
        Integer seatNumber,
        String category
) {
    public static VenueSeatResponse from(VenueSeat seat) {
        return new VenueSeatResponse(seat.getId(), seat.getRowLabel(), seat.getSeatNumber(), seat.getCategory());
    }
}
