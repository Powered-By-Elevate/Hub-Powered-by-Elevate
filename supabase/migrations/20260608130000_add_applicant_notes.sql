-- Quick pipeline-notes field for applicants, shown on the Applicants list and
-- editable from the Edit Applicant modal (where HR moves candidates through
-- stages). This is separate from the per-profile employee_notes thread — it's a
-- single at-a-glance note like "6/9 Pat likes; Anita still debating". Safe to
-- re-run.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS applicant_notes text;
