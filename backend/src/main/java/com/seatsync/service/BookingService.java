package com.seatsync.service;

import com.seatsync.domain.*;
import com.seatsync.dto.booking.BookingResponse;
import com.seatsync.dto.booking.LockSeatsRequest;
import com.seatsync.exception.BadRequestException;
import com.seatsync.exception.ResourceNotFoundException;
import com.seatsync.exception.SeatConflictException;
import com.seatsync.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;
    private final ShowRepository showRepository;
    private final UserRepository userRepository;
    private final SeatBroadcastService broadcastService;

    @Value("${seatsync.booking.hold-duration-minutes}")
    private long holdDurationMinutes;

    @Transactional
    public BookingResponse lockSeats(Long customerId, LockSeatsRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
        Show show = showRepository.findById(request.showId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + request.showId()));

        List<Long> seatIds = request.seatIds().stream().distinct().toList();
        List<Seat> requestedSeats = seatRepository.findAllById(seatIds);
        if (requestedSeats.size() != seatIds.size()) {
            throw new ResourceNotFoundException("One or more requested seats do not exist");
        }
        for (Seat seat : requestedSeats) {
            if (!seat.getShow().getId().equals(request.showId())) {
                throw new BadRequestException("Seat " + seat.getId() + " does not belong to show " + request.showId());
            }
        }

        BigDecimal totalAmount = requestedSeats.stream().map(Seat::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        Instant now = Instant.now();
        Instant holdExpiresAt = now.plus(holdDurationMinutes, ChronoUnit.MINUTES);

        Booking booking = Booking.builder()
                .customer(customer)
                .show(show)
                .status(BookingStatus.HELD)
                .totalAmount(totalAmount)
                .holdExpiresAt(holdExpiresAt)
                .build();
        booking = bookingRepository.save(booking);

        // FR-LOCK-01 / FR-LOCK-02: each seat lock is its own atomic conditional
        // UPDATE. If any one loses the race, the whole transaction (booking row
        // + any seats already locked in it) rolls back - all-or-nothing, per the
        // business rule that all seats in a booking share one hold and payment.
        List<Long> conflictingSeatIds = new ArrayList<>();
        for (Long seatId : seatIds) {
            int rowsUpdated = seatRepository.tryLockSeat(seatId, customerId, booking.getId(), holdExpiresAt, now);
            log.info("seat-lock attempt seatId={} bookingId={} customerId={} result={}",
                    seatId, booking.getId(), customerId, rowsUpdated == 1 ? "WON" : "LOST");
            if (rowsUpdated != 1) {
                conflictingSeatIds.add(seatId);
            }
        }

        if (!conflictingSeatIds.isEmpty()) {
            throw new SeatConflictException(
                    "Seat(s) no longer available: " + conflictingSeatIds, conflictingSeatIds);
        }

        Booking finalBooking = booking;
        List<BookingSeat> bookingSeats = requestedSeats.stream()
                .map(seat -> BookingSeat.builder().booking(finalBooking).seat(seat).build())
                .toList();
        bookingSeatRepository.saveAll(bookingSeats);

        List<Seat> lockedSeats = seatRepository.findByBookingId(booking.getId());
        broadcastService.broadcast(show.getId(), lockedSeats);

        // Re-fetch: tryLockSeat's clearAutomatically=true detached the `booking`
        // (and `show`) instances loaded earlier in this transaction, so their
        // lazy associations (show -> event) can no longer be initialized. A
        // fresh load is properly attached to the still-open persistence context.
        Booking freshBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        return BookingResponse.from(freshBooking, lockedSeats, "NONE");
    }

    public List<BookingResponse> listMyBookings(Long customerId, BookingStatus statusFilter) {
        List<Booking> bookings = statusFilter != null
                ? bookingRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, statusFilter)
                : bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);

        return bookings.stream().map(this::toResponse).toList();
    }

    public BookingResponse getMyBooking(Long customerId, Long bookingId) {
        Booking booking = requireOwnedBooking(bookingId, customerId);
        return toResponse(booking);
    }

    Booking requireOwnedBooking(Long bookingId, Long customerId) {
        return bookingRepository.findByIdAndCustomerId(bookingId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
    }

    private BookingResponse toResponse(Booking booking) {
        List<Seat> seats = bookingSeatRepository.findSeatsByBookingId(booking.getId());
        String paymentStatus = paymentRepository.findByBookingId(booking.getId())
                .map(p -> p.getStatus().name())
                .orElse("NONE");
        return BookingResponse.from(booking, seats, paymentStatus);
    }
}
