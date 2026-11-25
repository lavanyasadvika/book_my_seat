package com.seatsync.repository;

import com.seatsync.domain.Booking;
import com.seatsync.domain.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Booking> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, BookingStatus status);

    List<Booking> findByShowIdOrderByCreatedAtDesc(Long showId);

    List<Booking> findByShowEventOrganizerIdOrderByCreatedAtDesc(Long organizerId);

    Optional<Booking> findByIdAndCustomerId(Long id, Long customerId);

    /**
     * Idempotent status transition guarded by the expected current status,
     * so a booking already moved on by a concurrent webhook/confirmation
     * is left untouched (FR-PAY-06).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Booking b SET b.status = :newStatus WHERE b.id = :id AND b.status = :expectedStatus")
    int updateStatusIfCurrentlyIs(@Param("id") Long id,
                                   @Param("expectedStatus") BookingStatus expectedStatus,
                                   @Param("newStatus") BookingStatus newStatus);

    List<Booking> findByStatusAndHoldExpiresAtBefore(BookingStatus status, Instant cutoff);
}
