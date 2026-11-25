package com.seatsync.repository;

import com.seatsync.domain.Seat;
import com.seatsync.domain.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByShowIdOrderByRowLabelAscSeatNumberAsc(Long showId);

    List<Seat> findByBookingId(Long bookingId);

    List<Seat> findByStatusAndLockExpiresAtBefore(SeatStatus status, Instant cutoff);

    /**
     * The single atomic conditional UPDATE seat locking rests on (FR-LOCK-01).
     * Succeeds (returns 1) only when the seat is currently AVAILABLE, or
     * LOCKED with an already-expired hold nobody has released yet. Any other
     * concurrent attempt on the same seat returns 0 and must be treated as a
     * lock conflict (409) - never retried as a blind overwrite (FR-LOCK-02).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Seat s
           SET s.status = com.seatsync.domain.SeatStatus.LOCKED,
               s.lockedBy = :userId,
               s.bookingId = :bookingId,
               s.lockExpiresAt = :lockExpiresAt
         WHERE s.id = :seatId
           AND (s.status = com.seatsync.domain.SeatStatus.AVAILABLE
                OR (s.status = com.seatsync.domain.SeatStatus.LOCKED AND s.lockExpiresAt < :now))
        """)
    int tryLockSeat(@Param("seatId") Long seatId,
                     @Param("userId") Long userId,
                     @Param("bookingId") Long bookingId,
                     @Param("lockExpiresAt") Instant lockExpiresAt,
                     @Param("now") Instant now);

    /**
     * Confirms every seat of a booking as BOOKED. Only touches seats still
     * LOCKED under this exact booking id, so a duplicate/replayed
     * confirmation (client callback racing the webhook) is a no-op instead
     * of a double transition (FR-PAY-06).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Seat s
           SET s.status = com.seatsync.domain.SeatStatus.BOOKED,
               s.lockExpiresAt = null
         WHERE s.bookingId = :bookingId
           AND s.status = com.seatsync.domain.SeatStatus.LOCKED
        """)
    int confirmSeatsBooked(@Param("bookingId") Long bookingId);

    /**
     * Releases every seat currently held by a booking back to AVAILABLE,
     * regardless of hold-expiry time. Used when a payment fails/is
     * cancelled so the seat frees up immediately instead of waiting out
     * the hold timer.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Seat s
           SET s.status = com.seatsync.domain.SeatStatus.AVAILABLE,
               s.lockedBy = null,
               s.bookingId = null,
               s.lockExpiresAt = null
         WHERE s.bookingId = :bookingId
           AND s.status = com.seatsync.domain.SeatStatus.LOCKED
        """)
    int releaseHeldSeatsForBooking(@Param("bookingId") Long bookingId);

    /**
     * Releases a single expired hold, guarded by the original booking id
     * (FR-LOCK-04) so a seat already re-locked by a different booking in
     * the meantime is never incorrectly released.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Seat s
           SET s.status = com.seatsync.domain.SeatStatus.AVAILABLE,
               s.lockedBy = null,
               s.bookingId = null,
               s.lockExpiresAt = null
         WHERE s.id = :seatId
           AND s.bookingId = :bookingId
           AND s.status = com.seatsync.domain.SeatStatus.LOCKED
           AND s.lockExpiresAt < :now
        """)
    int releaseExpiredHold(@Param("seatId") Long seatId,
                            @Param("bookingId") Long bookingId,
                            @Param("now") Instant now);
}
