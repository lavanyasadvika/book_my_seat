package com.seatsync.dto.booking;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record LockSeatsRequest(
        @NotNull(message = "showId is required") Long showId,
        @NotEmpty(message = "at least one seatId is required") List<Long> seatIds
) {
}
