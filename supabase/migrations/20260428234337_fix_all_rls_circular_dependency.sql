/*
  # Fix RLS on all tables — replace circular users subquery with security definer function

  All tables previously checked HR role with:
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  
  This caused a recursive RLS loop. Replace with the security definer function
  public.get_user_role() which bypasses RLS.
*/

-- ============================================================
-- EMPLOYEES
-- ============================================================
DROP POLICY IF EXISTS "HR can view all employees" ON employees;
DROP POLICY IF EXISTS "HR can insert employees" ON employees;
DROP POLICY IF EXISTS "HR can update employees" ON employees;
DROP POLICY IF EXISTS "HR can delete employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

CREATE POLICY "HR can view all employees"
  ON employees FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "HR can insert employees"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update employees"
  ON employees FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can delete employees"
  ON employees FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- ONBOARDING TASKS
-- ============================================================
DROP POLICY IF EXISTS "HR can view all tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "HR can insert tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "HR can update tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "HR can delete tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Employees can view own tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Employees can update own tasks" ON onboarding_tasks;

CREATE POLICY "HR can view all tasks"
  ON onboarding_tasks FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "Employees can view own tasks"
  ON onboarding_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "HR can insert tasks"
  ON onboarding_tasks FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update tasks"
  ON onboarding_tasks FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "Employees can update own tasks"
  ON onboarding_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "HR can delete tasks"
  ON onboarding_tasks FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- ONBOARDING TEMPLATES
-- ============================================================
DROP POLICY IF EXISTS "HR can insert templates" ON onboarding_templates;
DROP POLICY IF EXISTS "HR can update templates" ON onboarding_templates;
DROP POLICY IF EXISTS "HR can delete templates" ON onboarding_templates;

CREATE POLICY "HR can insert templates"
  ON onboarding_templates FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update templates"
  ON onboarding_templates FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can delete templates"
  ON onboarding_templates FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- TEMPLATE TASKS
-- ============================================================
DROP POLICY IF EXISTS "HR can insert template tasks" ON template_tasks;
DROP POLICY IF EXISTS "HR can update template tasks" ON template_tasks;
DROP POLICY IF EXISTS "HR can delete template tasks" ON template_tasks;

CREATE POLICY "HR can insert template tasks"
  ON template_tasks FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update template tasks"
  ON template_tasks FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can delete template tasks"
  ON template_tasks FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "HR can insert documents" ON documents;
DROP POLICY IF EXISTS "HR can update documents" ON documents;
DROP POLICY IF EXISTS "HR can delete documents" ON documents;

CREATE POLICY "HR can insert documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update documents"
  ON documents FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can delete documents"
  ON documents FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- SCHEDULES
-- ============================================================
DROP POLICY IF EXISTS "HR can view all schedules" ON schedules;
DROP POLICY IF EXISTS "HR can insert schedules" ON schedules;
DROP POLICY IF EXISTS "HR can update schedules" ON schedules;
DROP POLICY IF EXISTS "HR can delete schedules" ON schedules;
DROP POLICY IF EXISTS "Employees can view own schedule" ON schedules;

CREATE POLICY "HR can view all schedules"
  ON schedules FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "Employees can view own schedule"
  ON schedules FOR SELECT TO authenticated
  USING (
    employee_id IS NULL OR
    EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "HR can insert schedules"
  ON schedules FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update schedules"
  ON schedules FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can delete schedules"
  ON schedules FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- CONTACTS
-- ============================================================
DROP POLICY IF EXISTS "HR can insert contacts" ON contacts;
DROP POLICY IF EXISTS "HR can update contacts" ON contacts;
DROP POLICY IF EXISTS "HR can delete contacts" ON contacts;

CREATE POLICY "HR can insert contacts"
  ON contacts FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update contacts"
  ON contacts FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can delete contacts"
  ON contacts FOR DELETE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
DROP POLICY IF EXISTS "HR can view activity log" ON activity_log;
DROP POLICY IF EXISTS "HR can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "Employees can insert own activity" ON activity_log;

CREATE POLICY "HR can view activity log"
  ON activity_log FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "Employees can insert own activity"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

-- ============================================================
-- SETUP TOKENS
-- ============================================================
DROP POLICY IF EXISTS "HR can insert tokens" ON setup_tokens;
DROP POLICY IF EXISTS "HR can update tokens" ON setup_tokens;

CREATE POLICY "HR can insert tokens"
  ON setup_tokens FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update tokens"
  ON setup_tokens FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'hr')
  WITH CHECK (public.get_user_role(auth.uid()) = 'hr');
