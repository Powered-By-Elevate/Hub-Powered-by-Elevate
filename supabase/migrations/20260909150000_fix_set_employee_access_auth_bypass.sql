/*
  # HOTFIX: set_employee_access was callable by anonymous users

  Introduced by 20260909130000 and live in production for roughly an hour.

  ## Two independent defects, either one sufficient to open the hole

  1. NULL comparison. The guard read:

         IF public.get_user_role(v_caller) <> 'hr' THEN return error

     For an unauthenticated caller auth.uid() is NULL, get_user_role(NULL)
     matches no row and returns NULL, and `NULL <> 'hr'` evaluates to NULL
     rather than TRUE. plpgsql treats a NULL condition as false, so the guard
     did not fire and execution fell straight through to the UPDATE.

     RLS policies were never affected by this: a USING clause treats NULL as
     false, so `get_user_role(auth.uid()) = 'hr'` correctly denies anon. The bug
     is specific to the procedural IF, where the same NULL flips the meaning.

  2. The anon grant was never actually removed. The original wrote
     `REVOKE ALL ON FUNCTION ... FROM public`, but Supabase's default privileges
     grant EXECUTE on new public-schema functions to anon and authenticated
     explicitly. Revoking from the PUBLIC pseudo-role does not touch an explicit
     grant to anon, so anon kept EXECUTE.

  Impact while live: anyone holding the anon key, which ships in the browser
  bundle and is public by design, could revoke any employee's access and ban
  their login given an employee id. Employee ids are uuids and are not exposed
  to anon by RLS, so this needed a guessed or leaked id to exploit. No evidence
  it was: the only anon call was the probe that found it, which passed a
  zero uuid, matched no row and changed nothing.

  ## The law

  In plpgsql, compare with IS DISTINCT FROM whenever the left side can be NULL.
  `<>` against NULL fails open. And in Supabase, revoking a function from PUBLIC
  is not the same as revoking it from anon.
*/

-- 1. Close the grant. This is the part that actually stops an anon caller.
REVOKE ALL ON FUNCTION public.set_employee_access(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.set_employee_access(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_employee_access(uuid, boolean) TO authenticated;

-- 2. Fail closed inside the function too, so the grant is not the only thing
--    standing between an anonymous caller and a ban.
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
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  IF public.get_user_role(v_caller) IS DISTINCT FROM 'hr' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only HR can change account access.');
  END IF;

  SELECT user_id INTO v_user_id FROM public.employees WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No such employee.');
  END IF;

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
