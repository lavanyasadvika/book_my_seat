package com.seatsync.dto.organizer;

import com.seatsync.domain.Show;
import com.seatsync.domain.ShowCategoryPrice;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record ShowResponse(
        Long id,
        Long eventId,
        String eventName,
        Long venueId,
        String venueName,
        Instant startTime,
        Instant endTime,
        Instant createdAt,
        Map<String, java.math.BigDecimal> categoryPrices
) {
    public static ShowResponse from(Show show, List<ShowCategoryPrice> prices) {
        return new ShowResponse(
                show.getId(),
                show.getEvent().getId(),
                show.getEvent().getName(),
                show.getEvent().getVenue().getId(),
                show.getEvent().getVenue().getName(),
                show.getStartTime(),
                show.getEndTime(),
                show.getCreatedAt(),
                prices.stream().collect(Collectors.toMap(ShowCategoryPrice::getCategory, ShowCategoryPrice::getPrice))
        );
    }
}
