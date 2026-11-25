package com.seatsync.dto.organizer;

import java.util.List;

/**
 * Either provide a grid (rows x columns) which is expanded into rows
 * labelled A, B, C... with seats numbered 1..columns, or provide an
 * explicit customSeats list for irregular layouts. Exactly one must be
 * supplied.
 */
public record SeatLayoutRequest(
        Integer rows,
        Integer columns,
        String defaultCategory,
        List<CustomSeatRequest> customSeats
) {
}
