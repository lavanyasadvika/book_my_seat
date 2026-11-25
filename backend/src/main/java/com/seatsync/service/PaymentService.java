package com.seatsync.service;

import com.seatsync.domain.*;
import com.seatsync.dto.booking.BookingResponse;
import com.seatsync.dto.booking.CheckoutResponse;
import com.seatsync.dto.booking.ConfirmPaymentRequest;
import com.seatsync.exception.BadRequestException;
import com.seatsync.exception.ResourceNotFoundException;
import com.seatsync.repository.BookingRepository;
import com.seatsync.repository.BookingSeatRepository;
import com.seatsync.repository.PaymentRepository;
import com.seatsync.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;
    private final SeatRepository seatRepository;
    private final RazorpayService razorpayService;
    private final SeatBroadcastService broadcastService;

    @Value("${razorpay.currency}")
    private String currency;

    @Transactional
    public CheckoutResponse initiateCheckout(Long customerId, Long bookingId) {
        Booking booking = bookingService.requireOwnedBooking(bookingId, customerId);

        if (booking.getStatus() != BookingStatus.HELD) {
            throw new BadRequestException("Booking is not awaiting payment (status: " + booking.getStatus() + ")");
        }
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Seat hold has expired; please select seats again");
        }

        Payment payment = paymentRepository.findByBookingId(bookingId).orElse(null);

        if (payment != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new BadRequestException("Booking is already paid");
        }

        if (payment != null && payment.getStatus() == PaymentStatus.INITIATED && payment.getRazorpayOrderId() != null) {
            log.info("Reusing existing Razorpay order for bookingId={}", bookingId);
            return new CheckoutResponse(bookingId, payment.getRazorpayOrderId(), razorpayService.getKeyId(),
                    booking.getTotalAmount(), currency);
        }

        String orderId = razorpayService.createOrder(booking.getTotalAmount(), currency, "booking_" + bookingId);

        if (payment == null) {
            payment = Payment.builder()
                    .bookingId(bookingId)
                    .status(PaymentStatus.INITIATED)
                    .amount(booking.getTotalAmount())
                    .build();
        }
        payment.setRazorpayOrderId(orderId);
        payment.setStatus(PaymentStatus.INITIATED);
        paymentRepository.save(payment);

        log.info("Created Razorpay order={} for bookingId={} amount={}", orderId, bookingId, booking.getTotalAmount());
        return new CheckoutResponse(bookingId, orderId, razorpayService.getKeyId(), booking.getTotalAmount(), currency);
    }

    @Transactional
    public BookingResponse confirmPayment(Long customerId, Long bookingId, ConfirmPaymentRequest request) {
        Booking booking = bookingService.requireOwnedBooking(bookingId, customerId);
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("No payment has been initiated for this booking"));

        if (!payment.getRazorpayOrderId().equals(request.razorpayOrderId())) {
            throw new BadRequestException("Order id does not match this booking's payment");
        }

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("confirmPayment: bookingId={} already SUCCESS, idempotent no-op", bookingId);
            return toBookingResponse(booking, payment);
        }
        if (payment.getStatus() != PaymentStatus.INITIATED) {
            throw new BadRequestException("Payment is in a terminal state: " + payment.getStatus());
        }

        boolean signatureValid = razorpayService.verifyPaymentSignature(
                request.razorpayOrderId(), request.razorpayPaymentId(), request.razorpaySignature());

        if (!signatureValid) {
            log.warn("Payment signature verification FAILED for bookingId={}", bookingId);
            throw new BadRequestException("Payment signature verification failed");
        }

        markPaymentSuccess(payment, request.razorpayPaymentId(), request.razorpaySignature());

        // Re-fetch both: the bulk updates inside markPaymentSuccess detached
        // `booking` and left the in-memory `payment` object's status stale
        // (bulk @Modifying queries never touch already-loaded Java objects).
        Booking refreshedBooking = bookingRepository.findById(bookingId).orElseThrow();
        Payment refreshedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        return toBookingResponse(refreshedBooking, refreshedPayment);
    }

    /**
     * Server-to-server source of truth for payment.captured / payment.failed
     * events (FR-PAY-05). Idempotent against duplicate deliveries (FR-PAY-06).
     */
    @Transactional
    public void handleWebhookEvent(String eventType, String razorpayOrderId, String razorpayPaymentId) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId).orElse(null);
        if (payment == null) {
            log.warn("Webhook event={} for unknown razorpayOrderId={}", eventType, razorpayOrderId);
            return;
        }

        if ("payment.captured".equals(eventType)) {
            if (payment.getStatus() != PaymentStatus.INITIATED) {
                log.info("Webhook payment.captured: payment id={} already {}, ignoring duplicate", payment.getId(), payment.getStatus());
                return;
            }
            markPaymentSuccess(payment, razorpayPaymentId, null);
        } else if ("payment.failed".equals(eventType)) {
            if (payment.getStatus() != PaymentStatus.INITIATED) {
                log.info("Webhook payment.failed: payment id={} already {}, ignoring duplicate", payment.getId(), payment.getStatus());
                return;
            }
            markPaymentFailed(payment);
        } else {
            log.info("Ignoring unhandled webhook event type={}", eventType);
        }
    }

    private void markPaymentSuccess(Payment payment, String razorpayPaymentId, String signature) {
        int paymentUpdated = paymentRepository.markStatusIfCurrentlyIs(
                payment.getId(), PaymentStatus.INITIATED, PaymentStatus.SUCCESS,
                razorpayPaymentId, signature != null ? signature : payment.getRazorpaySignature());

        if (paymentUpdated == 0) {
            log.info("markPaymentSuccess: payment id={} was already processed, skipping", payment.getId());
            return;
        }

        Long bookingId = payment.getBookingId();
        int bookingUpdated = bookingRepository.updateStatusIfCurrentlyIs(bookingId, BookingStatus.HELD, BookingStatus.BOOKED);
        int seatsUpdated = seatRepository.confirmSeatsBooked(bookingId);
        log.info("Payment SUCCESS bookingId={} bookingRowsUpdated={} seatsBooked={}", bookingId, bookingUpdated, seatsUpdated);

        List<Seat> seats = bookingSeatRepository.findSeatsByBookingId(bookingId);
        if (!seats.isEmpty()) {
            List<Long> seatIds = seats.stream().map(Seat::getId).toList();
            List<Seat> refreshed = seatRepository.findAllById(seatIds);
            broadcastService.broadcast(refreshed.get(0).getShow().getId(), refreshed);
        }
    }

    private void markPaymentFailed(Payment payment) {
        int paymentUpdated = paymentRepository.updateStatusIfCurrentlyIs(payment.getId(), PaymentStatus.INITIATED, PaymentStatus.FAILED);
        if (paymentUpdated == 0) {
            log.info("markPaymentFailed: payment id={} was already processed, skipping", payment.getId());
            return;
        }

        Long bookingId = payment.getBookingId();
        bookingRepository.updateStatusIfCurrentlyIs(bookingId, BookingStatus.HELD, BookingStatus.CANCELLED);

        List<Seat> seatsBeforeRelease = bookingSeatRepository.findSeatsByBookingId(bookingId);
        seatRepository.releaseHeldSeatsForBooking(bookingId);
        log.info("Payment FAILED bookingId={}, released {} seat(s)", bookingId, seatsBeforeRelease.size());

        if (!seatsBeforeRelease.isEmpty()) {
            List<Long> seatIds = seatsBeforeRelease.stream().map(Seat::getId).toList();
            List<Seat> refreshed = seatRepository.findAllById(seatIds);
            broadcastService.broadcast(refreshed.get(0).getShow().getId(), refreshed);
        }
    }

    private BookingResponse toBookingResponse(Booking booking, Payment payment) {
        List<Seat> seats = bookingSeatRepository.findSeatsByBookingId(booking.getId());
        return BookingResponse.from(booking, seats, payment.getStatus().name());
    }
}
