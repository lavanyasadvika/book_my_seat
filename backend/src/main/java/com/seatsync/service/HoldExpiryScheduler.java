package com.seatsync.service;

import com.seatsync.domain.Seat;
import com.seatsync.domain.SeatStatus;
import com.seatsync.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * FR-LOCK-03: runs at a fixed interval to find and release seats whose hold
 * has expired without a completed payment.
 */
@Component
@RequiredArgsConstructor
public class HoldExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(HoldExpiryScheduler.class);

    private final SeatRepository seatRepository;
    private final HoldExpiryService holdExpiryService;

    @Scheduled(fixedRateString = "${seatsync.booking.hold-expiry-scan-interval-ms}")
    public void scanAndReleaseExpiredHolds() {
        List<Seat> expiredSeats = seatRepository.findByStatusAndLockExpiresAtBefore(SeatStatus.LOCKED, Instant.now());
        if (expiredSeats.isEmpty()) {
            return;
        }

        Map<Long, List<Seat>> byBooking = expiredSeats.stream()
                .filter(s -> s.getBookingId() != null)
                .collect(Collectors.groupingBy(Seat::getBookingId));

        log.info("hold-expiry scan: {} expired seat(s) across {} booking(s)", expiredSeats.size(), byBooking.size());

        for (Map.Entry<Long, List<Seat>> entry : byBooking.entrySet()) {
            Long bookingId = entry.getKey();
            List<Seat> seats = entry.getValue();
            Long showId = seats.get(0).getShow().getId();
            List<Long> seatIds = seats.stream().map(Seat::getId).toList();

            try {
                holdExpiryService.expireHoldForBooking(bookingId, seatIds, showId);
            } catch (Exception e) {
                log.error("Failed to expire hold for bookingId={}, will retry on next scan", bookingId, e);
            }
        }
    }
}
