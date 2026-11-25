package com.seatsync.dto.organizer;

import com.seatsync.domain.Venue;

import java.time.Instant;
import java.util.List;

public record VenueResponse(
        Long id,
        String name,
        String address,
        Instant createdAt,
        List<VenueSeatResponse> seats
) {
    public static VenueResponse from(Venue venue) {
        return new VenueResponse(
                venue.getId(),
                venue.getName(),
                venue.getAddress(),
                venue.getCreatedAt(),
                venue.getSeats().stream().map(VenueSeatResponse::from).toList()
        );
    }
}
