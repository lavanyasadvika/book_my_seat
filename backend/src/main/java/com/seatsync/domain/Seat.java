package com.seatsync.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A real, bookable seat instance for one Show. State transitions
 * (AVAILABLE -> LOCKED -> BOOKED, or LOCKED -> AVAILABLE on expiry/failed
 * payment) are performed exclusively through conditional UPDATE statements
 * in {@link com.seatsync.repository.SeatRepository} - never via a
 * read-modify-write of this entity - so that concurrent requests for the
 * same seat cannot race.
 */
@Entity
@Table(name = "seats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_seat_id", nullable = false)
    private VenueSeat venueSeat;

    @Column(name = "row_label", nullable = false, length = 10)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SeatStatus status = SeatStatus.AVAILABLE;

    @Column(name = "locked_by")
    private Long lockedBy;

    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "lock_expires_at")
    private Instant lockExpiresAt;
}
