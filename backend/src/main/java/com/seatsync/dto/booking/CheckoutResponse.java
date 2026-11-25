package com.seatsync.dto.booking;

import java.math.BigDecimal;

public record CheckoutResponse(
        Long bookingId,
        String razorpayOrderId,
        String razorpayKeyId,
        BigDecimal amount,
        String currency
) {
}
