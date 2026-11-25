package com.seatsync.service;

import com.seatsync.domain.Seat;
import com.seatsync.dto.ws.SeatUpdateMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SeatBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcast(Long showId, List<Seat> seats) {
        if (seats.isEmpty()) {
            return;
        }
        List<SeatUpdateMessage.SeatStatusEntry> entries = seats.stream()
                .map(s -> new SeatUpdateMessage.SeatStatusEntry(s.getId(), s.getStatus().name()))
                .toList();
        messagingTemplate.convertAndSend("/topic/shows/" + showId, new SeatUpdateMessage(showId, entries, Instant.now()));
    }

    public void broadcastSingle(Long showId, Long seatId, String status) {
        messagingTemplate.convertAndSend("/topic/shows/" + showId,
                new SeatUpdateMessage(showId, List.of(new SeatUpdateMessage.SeatStatusEntry(seatId, status)), Instant.now()));
    }
}
