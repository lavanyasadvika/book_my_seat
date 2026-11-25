package com.seatsync.dto.organizer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CustomSeatRequest(
        @NotBlank(message = "rowLabel is required") String rowLabel,
        @NotNull(message = "seatNumber is required") Integer seatNumber,
        String category
) {
}
