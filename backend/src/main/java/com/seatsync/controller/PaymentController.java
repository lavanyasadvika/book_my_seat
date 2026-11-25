package com.seatsync.controller;

import com.seatsync.dto.booking.BookingResponse;
import com.seatsync.dto.booking.CheckoutResponse;
import com.seatsync.dto.booking.ConfirmPaymentRequest;
import com.seatsync.security.SecurityUser;
import com.seatsync.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /** FR-PAY-01: creates a Razorpay Order for a held booking. */
    @PostMapping("/{bookingId}/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@AuthenticationPrincipal SecurityUser user,
                                                       @PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.initiateCheckout(user.getId(), bookingId));
    }

    /** FR-PAY-03/04: client-side confirmation, verified server-side via HMAC-SHA256. */
    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingResponse> confirm(@AuthenticationPrincipal SecurityUser user,
                                                     @PathVariable Long bookingId,
                                                     @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.ok(paymentService.confirmPayment(user.getId(), bookingId, request));
    }
}
