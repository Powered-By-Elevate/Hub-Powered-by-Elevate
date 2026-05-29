-- Adds a teams_join_url column to each check-in / review table so that HR
-- can attach a Microsoft Teams meeting link to any scheduled check-in.
-- The link is set client-side via Microsoft Graph (/me/onlineMeetings)
-- when HR opts in at scheduling time; otherwise stays NULL.

ALTER TABLE quarterly_checkins ADD COLUMN IF NOT EXISTS teams_join_url text;
ALTER TABLE lifecycle_checkins ADD COLUMN IF NOT EXISTS teams_join_url text;
ALTER TABLE annual_reviews     ADD COLUMN IF NOT EXISTS teams_join_url text;
