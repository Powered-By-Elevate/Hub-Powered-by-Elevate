-- Department-level visibility scope for managers/leaders.
--
-- Existing scopes are App-Wide, Company, and Direct-Reports. True North's
-- "construction" and "finance/accounting" leadership groups map to departments,
-- not companies, so we add a 'department_reports' scope. The departments a
-- manager can see are stored as a text[] of department names on their user row.
-- Safe to re-run. Existing managers are unaffected (column defaults to null).

ALTER TABLE users ADD COLUMN IF NOT EXISTS visibility_departments text[];
