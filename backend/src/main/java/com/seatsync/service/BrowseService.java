package com.seatsync.service;

import com.seatsync.domain.Event;
import com.seatsync.domain.Show;
import com.seatsync.dto.organizer.EventResponse;
import com.seatsync.dto.organizer.SeatResponse;
import com.seatsync.dto.organizer.ShowResponse;
import com.seatsync.exception.ResourceNotFoundException;
import com.seatsync.repository.EventRepository;
import com.seatsync.repository.SeatRepository;
import com.seatsync.repository.ShowCategoryPriceRepository;
import com.seatsync.repository.ShowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrowseService {

    private final EventRepository eventRepository;
    private final ShowRepository showRepository;
    private final ShowCategoryPriceRepository showCategoryPriceRepository;
    private final SeatRepository seatRepository;

    public List<EventResponse> listEvents() {
        return eventRepository.findAllByOrderByCreatedAtDesc().stream().map(EventResponse::from).toList();
    }

    public EventResponse getEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        return EventResponse.from(event);
    }

    public List<ShowResponse> listShowsForEvent(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return showRepository.findByEventIdOrderByStartTimeAsc(eventId).stream()
                .map(show -> ShowResponse.from(show, showCategoryPriceRepository.findByShowId(show.getId())))
                .toList();
    }

    public ShowResponse getShow(Long showId) {
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + showId));
        return ShowResponse.from(show, showCategoryPriceRepository.findByShowId(showId));
    }

    public List<SeatResponse> getSeatMap(Long showId) {
        if (!showRepository.existsById(showId)) {
            throw new ResourceNotFoundException("Show not found: " + showId);
        }
        return seatRepository.findByShowIdOrderByRowLabelAscSeatNumberAsc(showId).stream()
                .map(SeatResponse::from)
                .toList();
    }
}
