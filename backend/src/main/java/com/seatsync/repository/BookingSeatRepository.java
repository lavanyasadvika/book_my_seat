package com.seatsync.repository;

import com.seatsync.domain.BookingSeat;
import com.seatsync.domain.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    @Query("SELECT bs.seat FROM BookingSeat bs WHERE bs.booking.id = :bookingId")
    List<Seat> findSeatsByBookingId(@Param("bookingId") Long bookingId);
}
