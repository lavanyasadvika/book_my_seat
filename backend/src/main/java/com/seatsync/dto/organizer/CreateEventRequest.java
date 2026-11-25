package com.seatsync.dto.organizer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateEventRequest(
        @NotNull(message = "venueId is required") Long venueId,
        @NotBlank(message = "name is required") String name,
        String description,
        String category
) {
}
