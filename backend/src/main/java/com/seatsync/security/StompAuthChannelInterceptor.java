package com.seatsync.security;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Requires a valid JWT on the STOMP CONNECT frame (Authorization: Bearer ...
 * header), consistent with FR-AUTH-04's "every non-auth endpoint requires a
 * valid JWT" - the WebSocket channel is not an exception.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");

            if (header == null || !header.startsWith(BEARER_PREFIX)) {
                throw new IllegalArgumentException("Missing or invalid Authorization header on STOMP CONNECT");
            }

            String token = header.substring(BEARER_PREFIX.length());
            Optional<Claims> claimsOpt = jwtService.parseClaims(token);
            if (claimsOpt.isEmpty()) {
                throw new IllegalArgumentException("Invalid or expired token on STOMP CONNECT");
            }

            String email = jwtService.extractEmail(claimsOpt.get());
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            if (!userDetails.isEnabled()) {
                throw new IllegalArgumentException("Account is deactivated");
            }

            var authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            accessor.setUser(authToken);
        }

        return message;
    }
}
