# SeatSync Frontend

React 19 + TypeScript + Vite client for the [SeatSync backend](../backend). Covers
both roles: Customer (browse, live seat map, hold, Razorpay checkout, booking
history) and Organizer (shared venue catalog, events, shows, live seat/booking
status). Both roles self-register directly — there is no Admin role.

## Stack

- React 19, TypeScript, Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- react-router-dom v6 for routing + role-gated routes
- axios with a JWT-attaching interceptor
- `@stomp/stompjs` + `sockjs-client` for the live seat map (STOMP over WebSocket)
- Razorpay Checkout.js (loaded in `index.html`)

## Running locally

For the full stack (this + backend + Postgres) via Docker, see `../README.md` —
that's the recommended path. To run just this frontend against the Vite dev
server (fastest edit-reload loop during development):

```bash
cp .env.example .env   # points VITE_API_BASE_URL at the backend, default localhost:8080
npm install
npm run dev
```

Opens on `http://localhost:5173`. The backend's CORS config already allows this
origin by default. Start the backend first (see `../backend/README.md`) — the app
has nothing to show without it.

```bash
npm run build   # type-checks (tsc -b) then builds
```

Note: this dev-server `.env` is a *different* mechanism from the root `.env` used
by `docker compose build` — Vite reads this one directly at dev-server start,
while the Docker image bakes `VITE_API_BASE_URL` in at build time via a Docker
build arg (see `Dockerfile`). Keep both in sync if you change the backend's URL.

## Structure

```
src/
  api/          typed REST clients + shared response types, one file per backend area
  auth/         AuthContext (JWT + role in localStorage) and RequireAuth route guard
  ws/           useSeatSocket - subscribes to /topic/shows/{id} for live seat updates
  components/   SeatMap, StatusBadge, CountdownTimer, loading/error/empty states
  layouts/      AppLayout - role-aware nav bar + outlet
  pages/
    customer/   browse events/shows, live seat map + lock/checkout flow, booking history
    organizer/  venue catalog (grid seat-layout builder, shared across organizers),
                events, shows (category prices derived from the venue, not typed),
                per-show live seat status + bookings
```

## Notable implementation details

- **Live seat map**: `useSeatSocket` opens one STOMP connection per mounted show
  page, authenticated the same way as REST calls (`Authorization: Bearer <jwt>`
  on the STOMP `CONNECT` frame, matching the backend's `StompAuthChannelInterceptor`).
  It only ever patches individual seat statuses in local state — the initial
  REST fetch remains the source of truth for everything else, matching the
  backend's own "WebSocket is a UI convenience only" design (FR-WS-03).
- **Booking flow**: seat selection → `POST /bookings/lock` → on success, a
  live countdown to `holdExpiresAt` and a "Pay now" button appear. A 409 with
  `conflictingSeatIds` (another customer won the race) deselects just those
  seats and refreshes the map, rather than failing the whole selection.
- **Razorpay**: `checkout` returns an order id + key id, which opens Razorpay's
  own hosted Checkout modal — no card details ever touch this app's code. The
  success handler posts the returned payment id/order id/signature to
  `POST /bookings/{id}/confirm` for server-side verification.
- **`vite.config.ts` has a `define: { global: 'globalThis' }`.** `sockjs-client`
  references Node's `global`, which Vite doesn't polyfill; without this the
  entire app throws `ReferenceError: global is not defined` on load, before
  anything renders. Found by actually running the app in a browser, not by
  type-checking — keep it if you ever touch this file.

## Verified golden path

Organizer registers directly (no Admin/provisioning step) → creates a venue
(grid seat layout) → any Organizer (including a different one) can then host
an Event + Show at that venue, subject to a 409 if the time slot overlaps
another Show already booked there → organizer's show view shows a live seat
grid → customer registers separately, lands on `/login` to authenticate (never
auto-logged in) → browses to the show → live seat map renders, color-coded by
seat category → selects seats → holds them (countdown starts) → "Pay now" hits
the real checkout endpoint (fails gracefully with a placeholder Razorpay key,
as expected without real Test Mode credentials) → booking shows up in "My
Bookings" as HELD. Locking a seat in one browser tab was confirmed to update
an already-open organizer tab's seat map live, with no reload, via the STOMP
broadcast.

## Design

Visual identity is intentionally distinct from any single real ticketing
platform (own crimson/ink palette, `src/index.css`), while following familiar
ticketing-app interaction patterns: a hero/search browse page with poster-style
event cards (`EventPoster.tsx` — gradient placeholders, since there's no real
artwork), showtimes grouped into date tabs, a cinema-style seat map with a
screen indicator and per-category seat coloring, and a ticket-stub-styled
booking confirmation.
