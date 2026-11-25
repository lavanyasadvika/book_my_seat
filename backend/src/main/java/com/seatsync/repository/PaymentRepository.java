package com.seatsync.repository;

import com.seatsync.domain.Payment;
import com.seatsync.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByBookingId(Long bookingId);

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    /**
     * Idempotent status transition guarded by the expected current status
     * (e.g. INITIATED -> SUCCESS). A duplicate webhook or a client
     * confirmation racing the webhook simply finds 0 rows affected and is
     * treated as already-processed rather than reapplied (FR-PAY-06).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Payment p SET p.status = :newStatus, p.razorpayPaymentId = :paymentId, p.razorpaySignature = :signature " +
           "WHERE p.id = :id AND p.status = :expectedStatus")
    int markStatusIfCurrentlyIs(@Param("id") Long id,
                                 @Param("expectedStatus") PaymentStatus expectedStatus,
                                 @Param("newStatus") PaymentStatus newStatus,
                                 @Param("paymentId") String paymentId,
                                 @Param("signature") String signature);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Payment p SET p.status = :newStatus WHERE p.id = :id AND p.status = :expectedStatus")
    int updateStatusIfCurrentlyIs(@Param("id") Long id,
                                   @Param("expectedStatus") PaymentStatus expectedStatus,
                                   @Param("newStatus") PaymentStatus newStatus);
}
