package com.seatsync.service;

import com.seatsync.domain.BookingStatus;
import com.seatsync.domain.PaymentStatus;
import com.seatsync.domain.Seat;
import com.seatsync.repository.BookingRepository;
import com.seatsync.repository.PaymentRepository;
import com.seatsync.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Expires the hold for a single booking. Each booking is released in its
 * own transaction (invoked as a separate Spring bean from
 * {@link HoldExpiryScheduler} so the transactional proxy actually applies)
 * so that a problem releasing one booking's seats can never roll back
 * another booking's already-committed release.
 */
@Service
@RequiredArgsConstructor
public class HoldExpiryService {

    private static final Logger log = LoggerFactory.getLogger(HoldExpiryService.class);

    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final SeatBroadcastService broadcastService;

    @Transactional
    public void expireHoldForBooking(Long bookingId, List<Long> seatIds, Long showId) {
        Instant now = Instant.now();
        int released = 0;

        for (Long seatId : seatIds) {
            // FR-LOCK-04: guarded by the original booking id so a seat already
            // re-locked by a different booking is never incorrectly released.
            int updated = seatRepository.releaseExpiredHold(seatId, bookingId, now);
            if (updated == 1) {
                released++;
            }
        }

        bookingRepository.updateStatusIfCurrentlyIs(bookingId, BookingStatus.HELD, BookingStatus.EXPIRED);
        paymentRepository.findByBookingId(bookingId).ifPresent(payment ->
                paymentRepository.updateStatusIfCurrentlyIs(payment.getId(), PaymentStatus.INITIATED, PaymentStatus.EXPIRED));

        log.info("hold-expiry: bookingId={} seatsConsidered={} seatsReleased={}", bookingId, seatIds.size(), released);

        if (released > 0) {
            List<Seat> refreshed = seatRepository.findAllById(seatIds);
            broadcastService.broadcast(showId, refreshed);
        }
    }
}
