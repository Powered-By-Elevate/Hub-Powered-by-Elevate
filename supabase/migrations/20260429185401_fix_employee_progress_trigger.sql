/*
  # Fix Employee Progress: Recalculation Function + Trigger

  1. Creates recalculate_employee_progress(emp_id uuid) — computes correct
     progress and status from onboarding_tasks and writes to employees.
  2. Creates a trigger on onboarding_tasks that fires after every INSERT,
     UPDATE, DELETE so employees.progress/status are always in sync.
  3. Runs the recalculation immediately for ALL employees so stale data
     is corrected on deploy.

  Status mapping:
    - 0 tasks total → progress = 0, status = 'not-started'
    - progress = 100 → status = 'complete', lifecycle_status = 'active'
    - any task overdue → status = 'overdue'
    - progress > 0 < 100, no overdue → status = 'in-progress'
    - progress = 0 → status = 'not-started'
*/

-- ── Helper function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_employee_progress(emp_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total      integer;
  v_completed  integer;
  v_overdue    integer;
  v_progress   integer;
  v_status     text;
  v_lifecycle  text;
  v_now        timestamptz;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'complete'),
    COUNT(*) FILTER (WHERE status = 'overdue')
  INTO v_total, v_completed, v_overdue
  FROM onboarding_tasks
  WHERE employee_id = emp_id
    AND task_phase  = 'onboarding';

  -- Calculate progress percentage
  IF v_total = 0 THEN
    v_progress := 0;
  ELSE
    v_progress := ROUND((v_completed::numeric / v_total::numeric) * 100);
  END IF;

  -- Determine status
  IF v_progress = 100 THEN
    v_status := 'complete';
  ELSIF v_overdue > 0 THEN
    v_status := 'overdue';
  ELSIF v_progress > 0 THEN
    v_status := 'in-progress';
  ELSE
    v_status := 'not-started';
  END IF;

  -- Determine lifecycle_status upgrade
  SELECT lifecycle_status INTO v_lifecycle FROM employees WHERE id = emp_id;

  IF v_progress = 100 AND v_lifecycle = 'onboarding' THEN
    v_now := now();
    UPDATE employees
    SET
      progress               = v_progress,
      status                 = v_status,
      lifecycle_status       = 'active',
      phase                  = 'active',
      onboarding_completed_at = COALESCE(onboarding_completed_at, v_now)
    WHERE id = emp_id;
  ELSE
    UPDATE employees
    SET
      progress = v_progress,
      status   = v_status
    WHERE id = emp_id;
  END IF;
END;
$$;

-- ── Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_sync_employee_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_emp_id uuid;
BEGIN
  -- On DELETE use OLD, otherwise use NEW
  IF TG_OP = 'DELETE' THEN
    affected_emp_id := OLD.employee_id;
  ELSE
    affected_emp_id := NEW.employee_id;
  END IF;

  IF affected_emp_id IS NOT NULL THEN
    PERFORM recalculate_employee_progress(affected_emp_id);
  END IF;

  RETURN NULL;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS sync_employee_progress ON onboarding_tasks;

CREATE TRIGGER sync_employee_progress
AFTER INSERT OR UPDATE OR DELETE ON onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION trg_sync_employee_progress();

-- ── Immediate full recalculation for all employees ─────────────────────────

DO $$
DECLARE
  emp RECORD;
BEGIN
  FOR emp IN SELECT id FROM employees LOOP
    PERFORM recalculate_employee_progress(emp.id);
  END LOOP;
END;
$$;
