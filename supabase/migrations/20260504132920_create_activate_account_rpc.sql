/*
  # Create activate_account RPC function

  1. New Functions
    - `activate_account(p_token_id, p_employee_id, p_user_id)` - SECURITY DEFINER function
      that links a newly-signed-up user to their employee record and marks the setup token
      as used. Runs with elevated privileges so newly-authenticated users can complete setup.

  2. Security
    - Function validates that the token exists and is unused
    - Function validates that the employee_id matches the token
    - Uses SECURITY DEFINER to bypass RLS for these specific operations
*/

CREATE OR REPLACE FUNCTION public.activate_account(
  p_token_id uuid,
  p_employee_id uuid,
  p_user_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token record;
BEGIN
  -- Validate token
  SELECT * INTO v_token FROM setup_tokens
  WHERE id = p_token_id AND employee_id = p_employee_id AND used = false;

  IF v_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token is invalid or already used.');
  END IF;

  -- Check expiry
  IF v_token.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This setup link has expired. Please contact HR for a new one.');
  END IF;

  -- Link user to employee
  UPDATE employees SET user_id = p_user_id WHERE id = p_employee_id;

  -- Upsert users record
  INSERT INTO users (id, email, role, employee_id)
  VALUES (p_user_id, p_email, 'employee', p_employee_id)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, employee_id = EXCLUDED.employee_id;

  -- Mark token as used
  UPDATE setup_tokens SET used = true WHERE id = p_token_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.activate_account TO authenticated;
