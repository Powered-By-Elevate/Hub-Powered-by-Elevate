-- The legacy reviews "view own" policy only matched employees.user_id =
-- auth.uid(). Most of the app links accounts the other way around
-- (users.employee_id -> employees.id), so employees whose record lacks the
-- user_id backlink could never see their own reviews. Accept either linkage.
-- Same hardening for the round3 tables that used the same pattern. Safe to
-- re-run.

DROP POLICY IF EXISTS "Employees can view own reviews" ON reviews;
CREATE POLICY "Employees can view own reviews"
  ON reviews FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Employees can view own development plans" ON development_plans;
CREATE POLICY "Employees can view own development plans"
  ON development_plans FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Employees can view own certifications" ON certifications;
CREATE POLICY "Employees can view own certifications"
  ON certifications FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Employees can view own checkins" ON checkins;
CREATE POLICY "Employees can view own checkins"
  ON checkins FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL)
  );
