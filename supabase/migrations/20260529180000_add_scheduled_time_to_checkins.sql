-- Adds a scheduled_time column to each check-in / review table so HR can pick
-- the time of day a meeting actually happens. Until set, the UI defaults to
-- 10:00 AM when creating the Teams meeting (matching previous behavior).

ALTER TABLE quarterly_checkins ADD COLUMN IF NOT EXISTS scheduled_time time;
ALTER TABLE lifecycle_checkins ADD COLUMN IF NOT EXISTS scheduled_time time;
ALTER TABLE annual_reviews     ADD COLUMN IF NOT EXISTS scheduled_time time;
