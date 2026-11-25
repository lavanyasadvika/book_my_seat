package com.seatsync.repository;

import com.seatsync.domain.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ShowRepository extends JpaRepository<Show, Long> {

    List<Show> findByEventIdOrderByStartTimeAsc(Long eventId);

    List<Show> findByEventOrganizerIdOrderByStartTimeAsc(Long organizerId);

    /**
     * Any Show at the given Venue whose [startTime, endTime) window overlaps
     * the requested one. Backs self-service venue booking: a Venue is shared
     * across Organizers, first-come-first-served, so a new Show is only
     * allowed where no existing Show at that Venue already claims the slot.
     */
    @Query("SELECT s FROM Show s WHERE s.event.venue.id = :venueId AND s.startTime < :endTime AND s.endTime > :startTime")
    List<Show> findOverlapping(@Param("venueId") Long venueId,
                                @Param("startTime") Instant startTime,
                                @Param("endTime") Instant endTime);
}
