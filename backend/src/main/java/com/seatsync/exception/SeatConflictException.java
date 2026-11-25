package com.seatsync.exception;

import java.util.List;

/**
 * Thrown when one or more requested seats could not be locked because a
 * concurrent request won the race (FR-LOCK-02). Maps to HTTP 409.
 */
public class SeatConflictException extends RuntimeException {

    private final List<Long> conflictingSeatIds;

    public SeatConflictException(String message, List<Long> conflictingSeatIds) {
        super(message);
        this.conflictingSeatIds = conflictingSeatIds;
    }

    public List<Long> getConflictingSeatIds() {
        return conflictingSeatIds;
    }
}
