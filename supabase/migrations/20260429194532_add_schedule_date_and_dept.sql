/*
  # Add date and department fields to schedules table

  ## Changes

  ### schedules table
  - Add `schedule_date` (date, nullable) — the actual calendar date of the schedule item
  - Add `department` (text, nullable) — for team-wide schedule items visible to a whole department
  - Existing rows (Day 1 items with employee_id IS NULL) remain unchanged

  ## Notes
  - schedule_date enables the week view in the Schedule tab
  - Items with schedule_date NULL are treated as Day 1 / time-of-day items
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'schedule_date'
  ) THEN
    ALTER TABLE schedules ADD COLUMN schedule_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'department'
  ) THEN
    ALTER TABLE schedules ADD COLUMN department text;
  END IF;
END $$;
