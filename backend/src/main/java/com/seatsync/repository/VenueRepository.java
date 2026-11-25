package com.seatsync.repository;

import com.seatsync.domain.Venue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    List<Venue> findByOrganizerId(Long organizerId);

    List<Venue> findAllByOrderByNameAsc();
}
