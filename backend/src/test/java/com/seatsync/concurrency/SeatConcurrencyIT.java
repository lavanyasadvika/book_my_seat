package com.seatsync.concurrency;

import com.seatsync.domain.*;
import com.seatsync.dto.booking.LockSeatsRequest;
import com.seatsync.exception.SeatConflictException;
import com.seatsync.repository.*;
import com.seatsync.service.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves the BRD's headline success metric: "Zero seats double-booked
 * across concurrent load testing (target: 100+ simultaneous requests on
 * one seat)". Fires 100 concurrent lock attempts at the same seat and
 * asserts exactly one wins (FR-LOCK-01/02).
 *
 * Runs against a real PostgreSQL container (Testcontainers), not H2: the
 * atomicity guarantee this test verifies rests entirely on Postgres's
 * row-level locking during UPDATE ... WHERE, which H2's MVStore engine
 * does not faithfully reproduce (verified empirically - H2 let dozens of
 * concurrent "conditional" updates all report success on the same row).
 * The Flyway migration also runs for real here, so this test doubles as a
 * check that V1__init_schema.sql is valid Postgres DDL.
 *
 * Deliberately NOT @Transactional: each thread must run its own real,
 * independently-committed transaction for the race to be genuine, rather
 * than being serialized behind a single test-managed transaction.
 *
 * Requires a running Docker engine (Testcontainers starts the Postgres
 * container automatically). If Docker is installed but this fails with
 * "Could not find a valid Docker environment", make sure Docker Desktop's
 * engine is actually running (not just installed).
 */
@Testcontainers
@SpringBootTest
class SeatConcurrencyIT {

    private static final int CONCURRENT_REQUESTS = 100;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("seatsync")
            .withUsername("seatsync")
            .withPassword("seatsync");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private VenueRepository venueRepository;
    @Autowired
    private VenueSeatRepository venueSeatRepository;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private ShowRepository showRepository;
    @Autowired
    private SeatRepository seatRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private BookingService bookingService;

    @Test
    void onlyOneOfManyConcurrentLockAttemptsOnTheSameSeatSucceeds() throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        User organizer = userRepository.save(User.builder()
                .name("Organizer").email("organizer-" + Instant.now().toEpochMilli() + "@test.local")
                .passwordHash(encoder.encode("password123")).role(Role.ORGANIZER).active(true).build());

        Venue venue = venueRepository.save(Venue.builder()
                .organizer(organizer).name("Test Venue").address("123 Test St").build());

        VenueSeat venueSeat = venueSeatRepository.save(VenueSeat.builder()
                .venue(venue).rowLabel("A").seatNumber(1).category("STANDARD").build());

        Event event = eventRepository.save(Event.builder()
                .venue(venue).organizer(organizer).name("Test Event").description("d").category("c").build());

        Show show = showRepository.save(Show.builder()
                .event(event)
                .startTime(Instant.now().plus(1, ChronoUnit.DAYS))
                .endTime(Instant.now().plus(1, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS))
                .build());

        Seat seat = seatRepository.save(Seat.builder()
                .show(show).venueSeat(venueSeat).rowLabel("A").seatNumber(1)
                .category("STANDARD").price(new BigDecimal("250.00")).status(SeatStatus.AVAILABLE)
                .build());

        List<Long> customerIds = new ArrayList<>();
        for (int i = 0; i < CONCURRENT_REQUESTS; i++) {
            User customer = userRepository.save(User.builder()
                    .name("Customer " + i).email("customer-" + i + "-" + Instant.now().toEpochMilli() + "@test.local")
                    .passwordHash(encoder.encode("password123")).role(Role.CUSTOMER).active(true).build());
            customerIds.add(customer.getId());
        }

        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_REQUESTS);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneGate = new CountDownLatch(CONCURRENT_REQUESTS);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = new CopyOnWriteArrayList<>();

        for (Long customerId : customerIds) {
            executor.submit(() -> {
                try {
                    startGate.await();
                    bookingService.lockSeats(customerId, new LockSeatsRequest(show.getId(), List.of(seat.getId())));
                    successCount.incrementAndGet();
                } catch (SeatConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneGate.countDown();
                }
            });
        }

        startGate.countDown();
        boolean completed = doneGate.await(60, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent lock attempts should finish within the timeout");
        assertTrue(unexpectedErrors.isEmpty(), "No unexpected errors should occur: " + unexpectedErrors);

        assertEquals(1, successCount.get(), "Exactly one concurrent request should win the seat lock");
        assertEquals(CONCURRENT_REQUESTS - 1, conflictCount.get(), "All other requests should receive a 409-mapped conflict");

        Seat finalSeat = seatRepository.findById(seat.getId()).orElseThrow();
        assertEquals(SeatStatus.LOCKED, finalSeat.getStatus());
        assertTrue(customerIds.contains(finalSeat.getLockedBy()), "Seat should be locked by one of the competing customers");

        long bookingsForShow = bookingRepository.findByShowIdOrderByCreatedAtDesc(show.getId()).stream()
                .filter(b -> b.getStatus() == BookingStatus.HELD)
                .count();
        assertEquals(1, bookingsForShow, "Only the winning attempt should leave behind a HELD booking");
    }
}
