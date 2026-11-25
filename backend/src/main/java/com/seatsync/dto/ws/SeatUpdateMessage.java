package com.seatsync.dto.ws;

import java.time.Instant;
import java.util.List;

/**
 * Broadcast on /topic/shows/{showId} whenever a seat lock, booking
 * confirmation, or hold expiry changes seat state (FR-WS-02). Purely a UI
 * convenience - the database's conditional UPDATE remains the sole
 * authority on seat availability (FR-WS-03).
 */
public record SeatUpdateMessage(
        Long showId,
        List<SeatStatusEntry> seats,
        Instant timestamp
) {
    public record SeatStatusEntry(Long seatId, String status) {
    }
}
