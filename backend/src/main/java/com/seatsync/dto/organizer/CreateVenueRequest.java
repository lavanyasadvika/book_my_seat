package com.seatsync.dto.organizer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateVenueRequest(
        @NotBlank(message = "name is required") String name,
        @NotBlank(message = "address is required") String address,
        @NotNull(message = "seatLayout is required") @Valid SeatLayoutRequest seatLayout
) {
}
