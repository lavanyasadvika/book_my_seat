package com.seatsync.exception;

/**
 * Thrown when a Show would overlap another Show already scheduled at the
 * same Venue (self-service venue booking: any Organizer may use any Venue,
 * first-come-first-served). Maps to HTTP 409, mirroring how a seat-lock
 * conflict is reported.
 */
public class VenueSlotConflictException extends RuntimeException {
    public VenueSlotConflictException(String message) {
        super(message);
    }
}
