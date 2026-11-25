package com.seatsync.controller;

import com.seatsync.domain.BookingStatus;
import com.seatsync.dto.booking.BookingResponse;
import com.seatsync.dto.booking.LockSeatsRequest;
import com.seatsync.security.SecurityUser;
import com.seatsync.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /** FR-CUST-02/03: lock one or more Available seats, starting a 5-minute hold. */
    @PostMapping("/lock")
    public ResponseEntity<BookingResponse> lockSeats(@AuthenticationPrincipal SecurityUser user,
                                                       @Valid @RequestBody LockSeatsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.lockSeats(user.getId(), request));
    }

    /** FR-CUST-04: booking history, optionally filtered by status. */
    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> myBookings(@AuthenticationPrincipal SecurityUser user,
                                                              @RequestParam(required = false) BookingStatus status) {
        return ResponseEntity.ok(bookingService.listMyBookings(user.getId(), status));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponse> getBooking(@AuthenticationPrincipal SecurityUser user,
                                                        @PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingService.getMyBooking(user.getId(), bookingId));
    }
}
