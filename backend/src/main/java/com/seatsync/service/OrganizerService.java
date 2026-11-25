package com.seatsync.service;

import com.seatsync.domain.*;
import com.seatsync.dto.organizer.*;
import com.seatsync.exception.BadRequestException;
import com.seatsync.exception.ResourceNotFoundException;
import com.seatsync.exception.UnauthorizedActionException;
import com.seatsync.exception.VenueSlotConflictException;
import com.seatsync.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizerService {

    private static final Logger log = LoggerFactory.getLogger(OrganizerService.class);
    private static final String DEFAULT_CATEGORY = "STANDARD";

    private final UserRepository userRepository;
    private final VenueRepository venueRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final EventRepository eventRepository;
    private final ShowRepository showRepository;
    private final ShowCategoryPriceRepository showCategoryPriceRepository;
    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;

    @Transactional
    public VenueResponse createVenue(Long organizerId, CreateVenueRequest request) {
        User organizer = requireOrganizer(organizerId);

        List<CustomSeatRequest> seatDefs = resolveSeatLayout(request.seatLayout());
        if (seatDefs.isEmpty()) {
            throw new BadRequestException("seatLayout must define either rows/columns or a non-empty customSeats list");
        }

        Venue venue = Venue.builder()
                .organizer(organizer)
                .name(request.name())
                .address(request.address())
                .build();
        venue = venueRepository.save(venue);

        List<VenueSeat> venueSeats = new ArrayList<>();
        for (CustomSeatRequest seatDef : seatDefs) {
            venueSeats.add(VenueSeat.builder()
                    .venue(venue)
                    .rowLabel(seatDef.rowLabel())
                    .seatNumber(seatDef.seatNumber())
                    .category(seatDef.category() != null ? seatDef.category() : DEFAULT_CATEGORY)
                    .build());
        }
        venueSeatRepository.saveAll(venueSeats);
        venue.setSeats(venueSeats);

        log.info("Organizer id={} created Venue id={} with {} seats", organizerId, venue.getId(), venueSeats.size());
        return VenueResponse.from(venue);
    }

    private List<CustomSeatRequest> resolveSeatLayout(SeatLayoutRequest layout) {
        if (layout.customSeats() != null && !layout.customSeats().isEmpty()) {
            return layout.customSeats();
        }
        if (layout.rows() != null && layout.columns() != null && layout.rows() > 0 && layout.columns() > 0) {
            String category = layout.defaultCategory() != null ? layout.defaultCategory() : DEFAULT_CATEGORY;
            List<CustomSeatRequest> generated = new ArrayList<>();
            for (int r = 0; r < layout.rows(); r++) {
                String rowLabel = toRowLabel(r);
                for (int c = 1; c <= layout.columns(); c++) {
                    generated.add(new CustomSeatRequest(rowLabel, c, category));
                }
            }
            return generated;
        }
        return List.of();
    }

    private String toRowLabel(int index) {
        StringBuilder sb = new StringBuilder();
        int n = index;
        do {
            sb.insert(0, (char) ('A' + (n % 26)));
            n = n / 26 - 1;
        } while (n >= 0);
        return sb.toString();
    }

    public List<VenueResponse> listVenues(Long organizerId) {
        return venueRepository.findByOrganizerId(organizerId).stream().map(VenueResponse::from).toList();
    }

    /**
     * Every listed Venue, regardless of who created it - Venues are a shared
     * catalog. Any Organizer can host an Event/Show at any Venue here,
     * subject only to no overlapping Show already booked there
     * (self-service, first-come-first-served).
     */
    public List<VenueResponse> listVenueCatalog() {
        return venueRepository.findAllByOrderByNameAsc().stream().map(VenueResponse::from).toList();
    }

    @Transactional
    public EventResponse createEvent(Long organizerId, CreateEventRequest request) {
        User organizer = requireOrganizer(organizerId);
        Venue venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + request.venueId()));

        Event event = Event.builder()
                .venue(venue)
                .organizer(organizer)
                .name(request.name())
                .description(request.description())
                .category(request.category())
                .build();
        event = eventRepository.save(event);

        log.info("Organizer id={} created Event id={} under Venue id={}", organizerId, event.getId(), venue.getId());
        return EventResponse.from(event);
    }

    public List<EventResponse> listEvents(Long organizerId) {
        return eventRepository.findByOrganizerId(organizerId).stream().map(EventResponse::from).toList();
    }

    private Event requireOwnedEvent(Long organizerId, Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new UnauthorizedActionException("You do not manage this event");
        }
        return event;
    }

    @Transactional
    public ShowResponse createShow(Long organizerId, CreateShowRequest request) {
        Event event = requireOwnedEvent(organizerId, request.eventId());

        if (!request.endTime().isAfter(request.startTime())) {
            throw new BadRequestException("endTime must be after startTime");
        }

        Long venueId = event.getVenue().getId();
        List<Show> overlapping = showRepository.findOverlapping(venueId, request.startTime(), request.endTime());
        if (!overlapping.isEmpty()) {
            throw new VenueSlotConflictException(
                    "Venue is already booked for an overlapping time slot (venueId=" + venueId + ")");
        }

        List<VenueSeat> venueSeats = venueSeatRepository.findByVenueIdOrderByRowLabelAscSeatNumberAsc(venueId);
        if (venueSeats.isEmpty()) {
            throw new BadRequestException("Venue has no seat layout defined; cannot create a Show");
        }

        Map<String, BigDecimal> priceByCategory = request.categoryPrices().stream()
                .collect(Collectors.toMap(CategoryPriceRequest::category, CategoryPriceRequest::price));

        // Every category actually present in the venue's seat layout must be
        // priced - no silent fallback to some other category's price for a
        // category the caller forgot (or mistyped).
        Set<String> missingCategories = venueSeats.stream()
                .map(VenueSeat::getCategory)
                .filter(category -> !priceByCategory.containsKey(category))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!missingCategories.isEmpty()) {
            throw new BadRequestException("Missing price for seat category: " + String.join(", ", missingCategories));
        }

        Show show = Show.builder()
                .event(event)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .build();
        Show savedShow = showRepository.save(show);

        List<ShowCategoryPrice> prices = priceByCategory.entrySet().stream()
                .map(e -> ShowCategoryPrice.builder().show(savedShow).category(e.getKey()).price(e.getValue()).build())
                .toList();
        showCategoryPriceRepository.saveAll(prices);

        List<Seat> seats = new ArrayList<>();
        for (VenueSeat vs : venueSeats) {
            BigDecimal price = priceByCategory.get(vs.getCategory());
            seats.add(Seat.builder()
                    .show(savedShow)
                    .venueSeat(vs)
                    .rowLabel(vs.getRowLabel())
                    .seatNumber(vs.getSeatNumber())
                    .category(vs.getCategory())
                    .price(price)
                    .status(SeatStatus.AVAILABLE)
                    .build());
        }
        seatRepository.saveAll(seats);

        log.info("Organizer id={} created Show id={} for Event id={} with {} seats",
                organizerId, savedShow.getId(), event.getId(), seats.size());
        return ShowResponse.from(savedShow, prices);
    }

    public List<ShowResponse> listShowsForEvent(Long organizerId, Long eventId) {
        requireOwnedEvent(organizerId, eventId);
        return showRepository.findByEventIdOrderByStartTimeAsc(eventId).stream()
                .map(show -> ShowResponse.from(show, showCategoryPriceRepository.findByShowId(show.getId())))
                .toList();
    }

    public List<SeatResponse> viewShowSeats(Long organizerId, Long showId) {
        Show show = requireOwnedShow(organizerId, showId);
        return seatRepository.findByShowIdOrderByRowLabelAscSeatNumberAsc(show.getId()).stream()
                .map(SeatResponse::from)
                .toList();
    }

    public List<OrganizerBookingResponse> viewShowBookings(Long organizerId, Long showId) {
        requireOwnedShow(organizerId, showId);
        return bookingRepository.findByShowIdOrderByCreatedAtDesc(showId).stream()
                .map(booking -> OrganizerBookingResponse.from(booking, bookingSeatRepository.findSeatsByBookingId(booking.getId())))
                .toList();
    }

    private Show requireOwnedShow(Long organizerId, Long showId) {
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + showId));
        if (!show.getEvent().getOrganizer().getId().equals(organizerId)) {
            throw new UnauthorizedActionException("You do not manage this show");
        }
        return show;
    }

    private User requireOrganizer(Long organizerId) {
        User user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer not found: " + organizerId));
        if (user.getRole() != Role.ORGANIZER) {
            throw new UnauthorizedActionException("User is not an Organizer");
        }
        return user;
    }
}
