package com.seatsync.dto.organizer;

import com.seatsync.domain.Event;

import java.time.Instant;

public record EventResponse(
        Long id,
        Long venueId,
        String venueName,
        String name,
        String description,
        String category,
        Instant createdAt
) {
    public static EventResponse from(Event event) {
        return new EventResponse(
                event.getId(),
                event.getVenue().getId(),
                event.getVenue().getName(),
                event.getName(),
                event.getDescription(),
                event.getCategory(),
                event.getCreatedAt()
        );
    }
}
