# SeatSync Backend

Real-time seat & slot booking platform backend, built from `SeatSync_BRD_v1.0.docx`.
Java 17, Spring Boot 3, PostgreSQL, STOMP/WebSocket, Razorpay (Test Mode).

## What this solves

Two customers can request the same seat at the same instant. SeatSync guarantees only
one of them ever gets it, using a single atomic conditional `UPDATE ... WHERE status =
'AVAILABLE'` at the database level (see `SeatRepository.tryLockSeat`) — never a
read-then-write check. This has been verified against a real PostgreSQL instance with
100 concurrent requests on one seat (`SeatConcurrencyIT`): exactly one wins, 99 get a
409 Conflict, zero double-bookings.

## Stack

- Java 17, Spring Boot 3.3 (Web, Security, WebSocket, Scheduling, Data JPA)
- PostgreSQL 16, Flyway migrations
- STOMP over WebSocket (SockJS fallback) for live seat-map updates
- Razorpay Java SDK, **Test Mode only**
- JWT auth (JJWT) + BCrypt password hashing

## Running locally

### Option A: Docker Compose (recommended)

The compose file lives at the **project root**, not here — it builds this service
alongside the frontend and Postgres as one stack. See `../README.md` for the full
setup; in short:

```bash
cd ..                  # project root
cp .env.example .env   # fill in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
docker compose up --build
```

Backend comes up on `http://localhost:8080`.

### Option B: Run the JAR against your own Postgres

```bash
docker run -d --name seatsync-pg -e POSTGRES_DB=seatsync -e POSTGRES_USER=seatsync \
  -e POSTGRES_PASSWORD=seatsync -p 5432:5432 postgres:16-alpine

mvn clean package
java -jar target/seatsync-backend-1.0.0.jar
```

All configuration is environment-variable driven (see `../.env.example` for the full
list) — nothing is hardcoded, including Razorpay keys and the JWT secret.

### First login

There's no Admin role or bootstrapped account — Organizers and Customers both
self-register via `POST /api/auth/register` with `role` set to `ORGANIZER` or
`CUSTOMER`, then log in via `POST /api/auth/login`.

### Razorpay setup

1. Create a free Razorpay account, switch the dashboard to **Test Mode**.
2. Copy the Test Mode Key ID / Key Secret into `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. In the dashboard, add a webhook pointing at `https://<your-host>/api/payments/webhook/razorpay`
   for the `payment.captured` and `payment.failed` events, and set `RAZORPAY_WEBHOOK_SECRET`
   to the secret you configure there. (For local testing, use the Razorpay CLI or a
   tunnel like ngrok to reach `localhost:8080`.)

No real payment ever moves — Test Mode keys only, enforced by convention (FR-PAY-07).

## Testing

```bash
mvn test      # fast unit tests only, no Docker required
mvn verify    # also runs SeatConcurrencyIT against a real Postgres via Testcontainers
```

`SeatConcurrencyIT` needs a running Docker engine (Testcontainers starts and tears
down the Postgres container automatically). If it fails with "Could not find a valid
Docker environment" despite Docker being installed, check that the Docker engine is
actually running — on locked-down corporate machines, endpoint-security software can
also block raw Docker API access from Java while still allowing the `docker` CLI
itself to work; if so, run the equivalent scenario manually (start a `postgres:16-alpine`
container, point `spring.datasource.*` at it, run the test class directly).

## API overview

All endpoints except `/api/auth/**`, `/api/payments/webhook/**`, and `/ws/**` require
`Authorization: Bearer <jwt>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` (`role`: `ORGANIZER` or `CUSTOMER`), `POST /api/auth/login` |
| Organizer | `POST /api/organizer/venues`, `GET /api/organizer/venues`, `POST /api/organizer/events`, `GET /api/organizer/events`, `POST /api/organizer/shows`, `GET /api/organizer/events/{id}/shows`, `GET /api/organizer/shows/{id}/seats`, `GET /api/organizer/shows/{id}/bookings` |
| Browse (any role) | `GET /api/events`, `GET /api/events/{id}`, `GET /api/events/{id}/shows`, `GET /api/shows/{id}`, `GET /api/shows/{id}/seats` |
| Booking (customer) | `POST /api/bookings/lock`, `GET /api/bookings/my?status=`, `GET /api/bookings/{id}` |
| Payment (customer) | `POST /api/bookings/{id}/checkout`, `POST /api/bookings/{id}/confirm` |
| Webhook | `POST /api/payments/webhook/razorpay` (public, HMAC-verified) |
| Real-time | STOMP `CONNECT` to `/ws` with `Authorization: Bearer <jwt>` header, `SUBSCRIBE /topic/shows/{showId}` |

### Creating a venue with a seat layout

Either a grid or a custom list:

```json
{
  "name": "Grand Cinema",
  "address": "1 Main St",
  "seatLayout": { "rows": 10, "columns": 12, "defaultCategory": "STANDARD" }
}
```

```json
{
  "name": "Grand Cinema",
  "address": "1 Main St",
  "seatLayout": {
    "customSeats": [
      { "rowLabel": "A", "seatNumber": 1, "category": "VIP" },
      { "rowLabel": "A", "seatNumber": 2, "category": "VIP" }
    ]
  }
}
```

Creating a Show against that venue (`POST /api/organizer/shows`) auto-generates one
bookable `Seat` per venue-seat template, priced per its category.

## Design notes

- **Seat state machine**: `AVAILABLE → LOCKED → BOOKED`, or `LOCKED → AVAILABLE` on
  expiry/failed payment. Every transition is a guarded conditional `UPDATE`, never an
  entity `save()` — see `SeatRepository`, `BookingRepository`, `PaymentRepository`.
- **Hold expiry**: `HoldExpiryScheduler` runs every `HOLD_EXPIRY_SCAN_INTERVAL_MS` (default
  30s), releasing seats whose hold has lapsed. Each booking is released in its own
  transaction (`HoldExpiryService`) so one booking's failure can't roll back another's
  already-committed release.
- **Booking history**: `booking_seats` is an immutable join table recording which seats
  belonged to a booking, independent of `seats.booking_id` (which gets cleared on
  release/failure) — so booking history still shows the right seats after expiry.
- **Payment idempotency**: both the client-side confirm endpoint and the Razorpay
  webhook route through the same `PaymentService` methods, guarded by conditional
  status transitions (`INITIATED → SUCCESS`/`FAILED`), so a duplicate webhook delivery
  or a race between the two is a no-op, not a double-processed payment.
- **WebSocket auth**: STOMP `CONNECT` requires the same JWT as REST endpoints
  (`StompAuthChannelInterceptor`) — there's no unauthenticated path into the system.
- **Scale-out**: the in-memory STOMP broker only works for one backend instance; the
  documented scale-out path is a RabbitMQ relay (`registry.enableStompBrokerRelay(...)`
  in `WebSocketConfig`), left as a follow-up per the BRD's own noted limitation.

## Out of scope

Live payments, refunds/cancellation-after-booking, multi-currency, native mobile,
and multi-instance WebSocket scaling are out of scope for this phase. There is no
Admin role or platform-wide oversight view (Organizers and Customers self-register
directly) — a deliberate simplification from the original BRD, which specified
Admin-provisioned Organizer accounts.
