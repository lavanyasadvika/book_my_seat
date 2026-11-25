-- SeatSync initial schema

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL,
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE venues (
    id              BIGSERIAL PRIMARY KEY,
    organizer_id    BIGINT        NOT NULL REFERENCES users(id),
    name            VARCHAR(200)  NOT NULL,
    address         VARCHAR(500)  NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_organizer_id ON venues(organizer_id);

-- Physical seat layout template for a venue (reused to generate real seats per show)
CREATE TABLE venue_seats (
    id              BIGSERIAL PRIMARY KEY,
    venue_id        BIGINT        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    row_label       VARCHAR(10)   NOT NULL,
    seat_number     INT           NOT NULL,
    category        VARCHAR(50)   NOT NULL DEFAULT 'STANDARD',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_venue_seat_position UNIQUE (venue_id, row_label, seat_number)
);

CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    venue_id        BIGINT        NOT NULL REFERENCES venues(id),
    organizer_id    BIGINT        NOT NULL REFERENCES users(id),
    name            VARCHAR(200)  NOT NULL,
    description     VARCHAR(2000),
    category        VARCHAR(100),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);

CREATE TABLE shows (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT        NOT NULL REFERENCES events(id),
    start_time      TIMESTAMPTZ   NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_shows_event_id ON shows(event_id);

-- Price per seat-category for a given show
CREATE TABLE show_category_prices (
    id              BIGSERIAL PRIMARY KEY,
    show_id         BIGINT        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    category        VARCHAR(50)   NOT NULL,
    price           NUMERIC(10,2) NOT NULL,
    CONSTRAINT uq_show_category UNIQUE (show_id, category)
);

-- Bookings must exist before seats reference them
CREATE TABLE bookings (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT        NOT NULL REFERENCES users(id),
    show_id             BIGINT        NOT NULL REFERENCES shows(id),
    status              VARCHAR(20)   NOT NULL,
    total_amount        NUMERIC(10,2) NOT NULL,
    hold_expires_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_show_id ON bookings(show_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Actual bookable seat instance for a specific show
CREATE TABLE seats (
    id                  BIGSERIAL PRIMARY KEY,
    show_id             BIGINT        NOT NULL REFERENCES shows(id),
    venue_seat_id       BIGINT        NOT NULL REFERENCES venue_seats(id),
    row_label           VARCHAR(10)   NOT NULL,
    seat_number         INT           NOT NULL,
    category            VARCHAR(50)   NOT NULL,
    price               NUMERIC(10,2) NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE',
    locked_by           BIGINT        REFERENCES users(id),
    booking_id          BIGINT        REFERENCES bookings(id),
    lock_expires_at     TIMESTAMPTZ,
    CONSTRAINT uq_seat_show_position UNIQUE (show_id, venue_seat_id)
);

CREATE INDEX idx_seats_show_id_status ON seats(show_id, status);
CREATE INDEX idx_seats_lock_expires_at ON seats(lock_expires_at) WHERE status = 'LOCKED';
CREATE INDEX idx_seats_booking_id ON seats(booking_id);

-- Immutable record of which seats belong to a booking, independent of the
-- live seats.booking_id pointer (which is cleared when a hold is released
-- or a payment fails, so booking history can still be reconstructed).
CREATE TABLE booking_seats (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT      NOT NULL REFERENCES bookings(id),
    seat_id         BIGINT      NOT NULL REFERENCES seats(id),
    CONSTRAINT uq_booking_seat UNIQUE (booking_id, seat_id)
);

CREATE INDEX idx_booking_seats_booking_id ON booking_seats(booking_id);

CREATE TABLE payments (
    id                      BIGSERIAL PRIMARY KEY,
    booking_id              BIGINT        NOT NULL UNIQUE REFERENCES bookings(id),
    razorpay_order_id       VARCHAR(100),
    razorpay_payment_id     VARCHAR(100),
    razorpay_signature      VARCHAR(255),
    status                  VARCHAR(20)   NOT NULL,
    amount                  NUMERIC(10,2) NOT NULL,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
