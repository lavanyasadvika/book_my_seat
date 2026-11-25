package com.seatsync.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
            "unit-test-secret-key-that-is-long-enough-for-hmac-sha-256-signing", 60);

    @Test
    void generatesAndParsesRoundTrip() {
        String token = jwtService.generateToken(42L, "user@example.com", "CUSTOMER");

        Optional<Claims> claims = jwtService.parseClaims(token);

        assertTrue(claims.isPresent());
        assertEquals("user@example.com", jwtService.extractEmail(claims.get()));
        assertEquals(42, claims.get().get("uid", Integer.class));
        assertEquals("CUSTOMER", claims.get().get("role", String.class));
    }

    @Test
    void rejectsTamperedToken() {
        String token = jwtService.generateToken(1L, "user@example.com", "CUSTOMER");
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertTrue(jwtService.parseClaims(tampered).isEmpty());
    }

    @Test
    void rejectsGarbageToken() {
        assertTrue(jwtService.parseClaims("not-a-jwt").isEmpty());
    }
}
