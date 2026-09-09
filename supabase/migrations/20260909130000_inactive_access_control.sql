/*
  # Inactive employees must lose elevated access

  Two independent switches, per Matt's 2026-09-09 decision:

    archived        -> hidden from the roster AND dropped to base employee level
    access_revoked  -> cannot sign in at all

  Terminated = both. On leave, or moving roles = archived only.

  ## Why this is a security fix and not just a feature

  43 RLS policies gate on get_user_role(auth.uid()) = 'hr'. Not one of them
  looked at employees.archived, so archiving an HR user removed them from the
  roster in the UI while leaving every HR read and write wide open to them at
  the database level. The anon key ships inside the browser bundle, so the app
  UI was never the security boundary and hiding a row from it protects nothing.

  Because all 43 policies funnel through one SECURITY DEFINER function, teaching
  that single function about archived closes all of them at once. No policy is
  rewritten here, which is also why this is safe to apply: the blast radius is
  one function body.
*/

-- ─── 1. access_revoked ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'access_revoked'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN access_revoked boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── 2. The choke point ─────────────────────────────────────────────────────
-- Was: SELECT role FROM public.users WHERE id = user_id
-- The parameter is referenced as $1 throughout, because employees.user_id would
-- otherwise collide with the parameter name and Postgres resolves that in favour
-- of the column.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
           WHEN e.access_revoked THEN 'revoked'
           WHEN e.archived       THEN 'employee'
           ELSE u.role
         END
  FROM public.users u
  LEFT JOIN public.employees e ON e.user_id = u.id
  WHERE u.id = $1
  LIMIT 1;
$$;

-- ─── 3. A revoked account cannot even read its own record ───────────────────
DROP POLICY IF EXISTS "Employees can view own record" ON employees;
CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND access_revoked = false);

-- ─── 4. One HR-only call that flips the switch in both places ───────────────
-- The auth ban is what actually stops a sign-in. Setting access_revoked alone
-- would leave a valid session able to keep working until its token expired.
CREATE OR REPLACE FUNCTION public.set_employee_access(p_employee_id uuid, p_revoked boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_caller  uuid := auth.uid();
BEGIN
  IF public.get_user_role(v_caller) <> 'hr' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only HR can change account access.');
  END IF;

  SELECT user_id INTO v_user_id FROM public.employees WHERE id = p_employee_id;

  -- Locking yourself out of the only HR account is unrecoverable from the UI.
  IF v_user_id IS NOT NULL AND v_user_id = v_caller AND p_revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot revoke your own access.');
  END IF;

  UPDATE public.employees SET access_revoked = p_revoked WHERE id = p_employee_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET banned_until = CASE WHEN p_revoked THEN now() + interval '100 years' ELSE NULL END
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'revoked', p_revoked, 'had_login', v_user_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.set_employee_access(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_employee_access(uuid, boolean) TO authenticated;

-- ─── 5. Reconcile anyone already banned by hand ─────────────────────────────
-- Tonia Benas was archived and banned directly in SQL on 2026-09-09, before this
-- column existed. Without this, the UI would offer to "Revoke Access" for an
-- account that is already revoked.
UPDATE public.employees e
SET access_revoked = true
FROM auth.users u
WHERE e.user_id = u.id
  AND u.banned_until IS NOT NULL
  AND u.banned_until > now()
  AND e.access_revoked = false;
