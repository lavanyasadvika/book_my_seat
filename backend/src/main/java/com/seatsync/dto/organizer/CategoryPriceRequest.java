package com.seatsync.dto.organizer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CategoryPriceRequest(
        @NotBlank(message = "category is required") String category,
        @NotNull(message = "price is required") @Positive(message = "price must be positive") BigDecimal price
) {
}
