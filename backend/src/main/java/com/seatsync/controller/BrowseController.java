package com.seatsync.controller;

import com.seatsync.dto.organizer.EventResponse;
import com.seatsync.dto.organizer.SeatResponse;
import com.seatsync.dto.organizer.ShowResponse;
import com.seatsync.service.BrowseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Read-only browsing for any authenticated user (FR-CUST-01). Requires a
 * valid JWT (FR-AUTH-04) but is not role-restricted to a single role.
 */
@RestController
@RequiredArgsConstructor
public class BrowseController {

    private final BrowseService browseService;

    @GetMapping("/api/events")
    public List<EventResponse> listEvents() {
        return browseService.listEvents();
    }

    @GetMapping("/api/events/{eventId}")
    public EventResponse getEvent(@PathVariable Long eventId) {
        return browseService.getEvent(eventId);
    }

    @GetMapping("/api/events/{eventId}/shows")
    public List<ShowResponse> listShowsForEvent(@PathVariable Long eventId) {
        return browseService.listShowsForEvent(eventId);
    }

    @GetMapping("/api/shows/{showId}")
    public ShowResponse getShow(@PathVariable Long showId) {
        return browseService.getShow(showId);
    }

    /** FR-CUST-01: visual seat map for a selected Show. */
    @GetMapping("/api/shows/{showId}/seats")
    public List<SeatResponse> getSeatMap(@PathVariable Long showId) {
        return browseService.getSeatMap(showId);
    }
}
