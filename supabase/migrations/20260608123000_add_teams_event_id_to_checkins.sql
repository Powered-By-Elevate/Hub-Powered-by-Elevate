-- Store the Outlook/Teams calendar event id alongside the join URL so that
-- deleting a check-in/review in the Hub can also cancel the meeting invite on
-- everyone's calendar (Graph DELETE /me/events/{id} sends cancellation notices).
-- Until set, deletes simply remove the Hub record (old behavior). Safe to re-run.

ALTER TABLE quarterly_checkins ADD COLUMN IF NOT EXISTS teams_event_id text;
ALTER TABLE lifecycle_checkins ADD COLUMN IF NOT EXISTS teams_event_id text;
ALTER TABLE annual_reviews     ADD COLUMN IF NOT EXISTS teams_event_id text;
