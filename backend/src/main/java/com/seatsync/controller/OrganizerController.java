package com.seatsync.controller;

import com.seatsync.dto.organizer.*;
import com.seatsync.security.SecurityUser;
import com.seatsync.service.OrganizerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerController {

    private final OrganizerService organizerService;

    /** FR-ORG-01: create a Venue with a seat layout. */
    @PostMapping("/venues")
    public ResponseEntity<VenueResponse> createVenue(@AuthenticationPrincipal SecurityUser user,
                                                       @Valid @RequestBody CreateVenueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(organizerService.createVenue(user.getId(), request));
    }

    @GetMapping("/venues")
    public ResponseEntity<List<VenueResponse>> listVenues(@AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(organizerService.listVenues(user.getId()));
    }

    /** Shared venue catalog - every listed Venue, not just this Organizer's own. */
    @GetMapping("/venues/catalog")
    public ResponseEntity<List<VenueResponse>> listVenueCatalog() {
        return ResponseEntity.ok(organizerService.listVenueCatalog());
    }

    /** FR-ORG-02: create an Event under a Venue. */
    @PostMapping("/events")
    public ResponseEntity<EventResponse> createEvent(@AuthenticationPrincipal SecurityUser user,
                                                       @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(organizerService.createEvent(user.getId(), request));
    }

    @GetMapping("/events")
    public ResponseEntity<List<EventResponse>> listEvents(@AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(organizerService.listEvents(user.getId()));
    }

    /** FR-ORG-03: create a time-boxed Show for an Event, with per-category pricing. */
    @PostMapping("/shows")
    public ResponseEntity<ShowResponse> createShow(@AuthenticationPrincipal SecurityUser user,
                                                     @Valid @RequestBody CreateShowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(organizerService.createShow(user.getId(), request));
    }

    @GetMapping("/events/{eventId}/shows")
    public ResponseEntity<List<ShowResponse>> listShowsForEvent(@AuthenticationPrincipal SecurityUser user,
                                                                  @PathVariable Long eventId) {
        return ResponseEntity.ok(organizerService.listShowsForEvent(user.getId(), eventId));
    }

    /** FR-ORG-04/05: view (read-only) real-time seat status for own shows. */
    @GetMapping("/shows/{showId}/seats")
    public ResponseEntity<List<SeatResponse>> viewShowSeats(@AuthenticationPrincipal SecurityUser user,
                                                              @PathVariable Long showId) {
        return ResponseEntity.ok(organizerService.viewShowSeats(user.getId(), showId));
    }

    /** FR-ORG-04: view booking status for own shows. */
    @GetMapping("/shows/{showId}/bookings")
    public ResponseEntity<List<OrganizerBookingResponse>> viewShowBookings(@AuthenticationPrincipal SecurityUser user,
                                                                             @PathVariable Long showId) {
        return ResponseEntity.ok(organizerService.viewShowBookings(user.getId(), showId));
    }
}
