package com.seatsync.dto.organizer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public record CreateShowRequest(
        @NotNull(message = "eventId is required") Long eventId,
        @NotNull(message = "startTime is required") @Future(message = "startTime must be in the future") Instant startTime,
        @NotNull(message = "endTime is required") @Future(message = "endTime must be in the future") Instant endTime,
        @NotEmpty(message = "at least one category price is required") @Valid List<CategoryPriceRequest> categoryPrices
) {
}
