package com.seatsync.repository;

import com.seatsync.domain.ShowCategoryPrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShowCategoryPriceRepository extends JpaRepository<ShowCategoryPrice, Long> {

    List<ShowCategoryPrice> findByShowId(Long showId);

    Optional<ShowCategoryPrice> findByShowIdAndCategory(Long showId, String category);
}
