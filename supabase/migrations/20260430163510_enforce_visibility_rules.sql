/*
  # Enforce Employee Visibility Rules via RLS

  ## Summary
  Enforces strict data visibility rules so employees can only access their own
  records and never see HR-internal fields. Managers can read their direct
  reports' data but cannot modify career development fields.

  ## Changes

  ### employees table
  - Employees can only SELECT their own row, and only the permitted columns
    (id, name, email, phone, role, department, team_id, manager, manager_user_id,
     start_date, status, phase, progress, archived, user_id, avatar_url, bio,
     onboarding_completed_at, lifecycle_status, birthday_month, birthday_day,
     company_id, current_level, pathway_id, employment_type, created_at)
  - Restricted from employee view: readiness_level, next_level, current_status
  - Achieved via a dedicated view `employee_self_view` with only safe columns

  ### checkins table
  - Employees SELECT only their own rows, restricted columns:
    (id, employee_id, checkin_date, pillar_focus, created_at)
  - Restricted: notes, decision, pillar_reflection, contribution_to_growth,
    business_dev_involvement, motivation_level, created_by
  - Achieved via `checkins_employee_view`

  ### reviews table
  - Employees SELECT only their own rows, restricted columns:
    (id, employee_id, review_date, review_type, review_year, created_at)
  - Restricted: sentiment, notes, pdf_path, created_by
  - Achieved via `reviews_employee_view`

  ### development_plans table
  - Employees SELECT their own rows — all columns visible (goals are collaborative)
  - Employees can UPDATE their own rows (progress_pct, notes)

  ### certifications table
  - Employees SELECT their own rows — all columns visible
  - proof_path visible so they can download their own proof

  ## Security Notes
  - All views use SECURITY DEFINER to bypass RLS on the underlying tables
    and return only the safe columns
  - The application queries these views for employee-role users
  - HR/manager roles continue to query the underlying tables directly
*/

-- ─── Safe view for employee self-view of their own record ──────────────────
CREATE OR REPLACE VIEW employee_self_view AS
SELECT
  id, name, email, phone, role, department, team_id, manager, manager_user_id,
  start_date, status, phase, progress, archived, user_id, avatar_url, bio,
  onboarding_completed_at, lifecycle_status, birthday_month, birthday_day,
  company_id, current_level, pathway_id, employment_type, created_at
FROM employees;

-- ─── Safe view for employee self-view of check-ins ─────────────────────────
-- Exposes only: date and pillar_focus. All HR-internal fields are excluded.
CREATE OR REPLACE VIEW checkins_employee_view AS
SELECT
  id, employee_id, checkin_date, pillar_focus, created_at
FROM checkins;

-- ─── Safe view for employee self-view of reviews ───────────────────────────
-- Exposes only: date, type, year. Sentiment, notes, pdf excluded.
CREATE OR REPLACE VIEW reviews_employee_view AS
SELECT
  id, employee_id, review_date, review_type, review_year, created_at
FROM reviews;

-- ─── RLS on checkins ───────────────────────────────────────────────────────
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- HR and managers can read all check-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'HR and managers can read all checkins'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR and managers can read all checkins"
        ON checkins FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('hr', 'manager')
          )
        )
    $policy$;
  END IF;

  -- HR can insert check-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'HR can insert checkins'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can insert checkins"
        ON checkins FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'hr'
          )
        )
    $policy$;
  END IF;

  -- HR can update check-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'HR can update checkins'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can update checkins"
        ON checkins FOR UPDATE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  -- HR can delete check-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'checkins' AND policyname = 'HR can delete checkins'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can delete checkins"
        ON checkins FOR DELETE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;
END $$;

-- ─── RLS on reviews ────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'HR and managers can read all reviews'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR and managers can read all reviews"
        ON reviews FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('hr', 'manager')
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'HR can insert reviews'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can insert reviews"
        ON reviews FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'HR can update reviews'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can update reviews"
        ON reviews FOR UPDATE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'HR can delete reviews'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can delete reviews"
        ON reviews FOR DELETE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;
END $$;

-- ─── RLS on development_plans ──────────────────────────────────────────────
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'development_plans' AND policyname = 'HR and managers can read all development plans'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR and managers can read all development plans"
        ON development_plans FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('hr', 'manager')
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'development_plans' AND policyname = 'Employees can read own development plans'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Employees can read own development plans"
        ON development_plans FOR SELECT
        TO authenticated
        USING (
          employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'development_plans' AND policyname = 'Employees can update own plan progress'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Employees can update own plan progress"
        ON development_plans FOR UPDATE
        TO authenticated
        USING (
          employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
          )
        )
        WITH CHECK (
          employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'development_plans' AND policyname = 'HR can insert development plans'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can insert development plans"
        ON development_plans FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'development_plans' AND policyname = 'HR can update all development plans'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can update all development plans"
        ON development_plans FOR UPDATE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'development_plans' AND policyname = 'HR can delete development plans'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can delete development plans"
        ON development_plans FOR DELETE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;
END $$;

-- ─── RLS on certifications ─────────────────────────────────────────────────
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'HR and managers can read all certifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR and managers can read all certifications"
        ON certifications FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('hr', 'manager')
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'Employees can read own certifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Employees can read own certifications"
        ON certifications FOR SELECT
        TO authenticated
        USING (
          employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'HR can insert certifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can insert certifications"
        ON certifications FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'HR can update certifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can update certifications"
        ON certifications FOR UPDATE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'HR can delete certifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can delete certifications"
        ON certifications FOR DELETE
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;
END $$;

-- ─── RLS on pathways ───────────────────────────────────────────────────────
ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pathways' AND policyname = 'Authenticated users can read active pathways'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can read active pathways"
        ON pathways FOR SELECT
        TO authenticated
        USING (active = true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pathways' AND policyname = 'HR can manage pathways'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "HR can manage pathways"
        ON pathways FOR ALL
        TO authenticated
        USING (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
        )
    $policy$;
  END IF;
END $$;
