package com.seatsync.dto.common;

import java.time.Instant;
import java.util.List;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<Long> conflictingSeatIds
) {
    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path, null);
    }

    public static ApiError ofSeatConflict(int status, String error, String message, String path, List<Long> conflictingSeatIds) {
        return new ApiError(Instant.now(), status, error, message, path, conflictingSeatIds);
    }
}
