-- Shows now carry an explicit end time so venue availability (two Shows at
-- the same Venue can't overlap) can be checked as a real time-range
-- comparison. Existing rows (dev/test data only) get a 2-hour default.
ALTER TABLE shows ADD COLUMN end_time TIMESTAMPTZ;
UPDATE shows SET end_time = start_time + INTERVAL '2 hours' WHERE end_time IS NULL;
ALTER TABLE shows ALTER COLUMN end_time SET NOT NULL;

-- Speeds up the overlap scan run on every Show creation (FR: venue self-
-- service booking - any Organizer may use any Venue, subject to no two
-- Shows at that Venue overlapping in time).
CREATE INDEX idx_shows_time_range ON shows(start_time, end_time);
