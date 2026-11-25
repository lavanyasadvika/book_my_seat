package com.seatsync.exception;

/**
 * Thrown when an authenticated user attempts an action outside their
 * ownership scope, e.g. an Organizer trying to manage another Organizer's
 * Venue/Event/Show (business rule in BRD section 6).
 */
public class UnauthorizedActionException extends RuntimeException {
    public UnauthorizedActionException(String message) {
        super(message);
    }
}
