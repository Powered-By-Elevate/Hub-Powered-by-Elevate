-- Adds a canonical sortable start_time column to schedules.
-- Existing time_label stays as the display label; start_time becomes the
-- source of truth for ordering. A trigger auto-derives start_time from
-- time_label so any code path that only writes a label keeps working.
-- A one-time backfill parses existing labels.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_time time;

CREATE INDEX IF NOT EXISTS schedules_date_time_idx
  ON schedules (schedule_date NULLS LAST, start_time NULLS LAST);

-- Best-effort parser for free-text time labels.
-- Handles: "10:00am", "9 PM", "330am", "1230pm", "14:00", "9am", etc.
-- Returns NULL on parse failure.
CREATE OR REPLACE FUNCTION parse_schedule_time_label(label text)
RETURNS time
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
  meridian text;
  num text;
  hh int;
  mm int;
BEGIN
  IF label IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(label));
  IF s = '' THEN RETURN NULL; END IF;

  meridian := substring(s from '(am|pm)');
  s := regexp_replace(s, '\s*(am|pm)\s*$', '', 'i');
  s := trim(s);

  IF s ~ '^\d{1,2}:\d{2}$' THEN
    hh := split_part(s, ':', 1)::int;
    mm := split_part(s, ':', 2)::int;
  ELSIF s ~ '^\d{3,4}$' THEN
    num := lpad(s, 4, '0');
    hh := substring(num from 1 for 2)::int;
    mm := substring(num from 3 for 2)::int;
  ELSIF s ~ '^\d{1,2}$' THEN
    hh := s::int;
    mm := 0;
  ELSE
    RETURN NULL;
  END IF;

  IF meridian = 'pm' AND hh < 12 THEN hh := hh + 12;
  ELSIF meridian = 'am' AND hh = 12 THEN hh := 0;
  END IF;

  IF hh > 23 OR mm > 59 THEN RETURN NULL; END IF;

  RETURN make_time(hh, mm, 0);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Auto-populate start_time from time_label on insert / update when not set explicitly.
-- Ensures legacy code paths (templates, raw inserts) still get sortable times.
CREATE OR REPLACE FUNCTION schedules_autoset_start_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_time IS NULL AND NEW.time_label IS NOT NULL THEN
    NEW.start_time := parse_schedule_time_label(NEW.time_label);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schedules_autoset_start_time_trg ON schedules;
CREATE TRIGGER schedules_autoset_start_time_trg
  BEFORE INSERT OR UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION schedules_autoset_start_time();

-- One-time backfill of existing rows.
UPDATE schedules
SET start_time = parse_schedule_time_label(time_label)
WHERE start_time IS NULL AND time_label IS NOT NULL;

-- Best-effort: place dateless events on the employee's start_date so the
-- per-day grouping renders sensibly. start_date is text but is reliably
-- YYYY-MM-DD when set by the application; rows that don't match are skipped.
UPDATE schedules s
SET schedule_date = e.start_date::date
FROM employees e
WHERE s.employee_id = e.id
  AND s.schedule_date IS NULL
  AND e.start_date ~ '^\d{4}-\d{2}-\d{2}$';
