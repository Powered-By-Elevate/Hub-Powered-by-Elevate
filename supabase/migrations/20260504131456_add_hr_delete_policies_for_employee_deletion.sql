/*
  # Add HR delete policies for full employee deletion

  1. Security Changes
    - Add DELETE policy on `employee_notes` for HR role
    - Add DELETE policy on `setup_tokens` for HR role
    - Add DELETE policy on `activity_log` for HR role
    - Add DELETE policy on `users` for HR role

  These are needed to support permanent employee deletion by HR.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR can delete employee notes' AND polrelid = 'public.employee_notes'::regclass) THEN
    CREATE POLICY "HR can delete employee notes" ON employee_notes FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = 'hr');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR can delete setup tokens' AND polrelid = 'public.setup_tokens'::regclass) THEN
    CREATE POLICY "HR can delete setup tokens" ON setup_tokens FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = 'hr');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR can delete activity log' AND polrelid = 'public.activity_log'::regclass) THEN
    CREATE POLICY "HR can delete activity log" ON activity_log FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = 'hr');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR can delete users' AND polrelid = 'public.users'::regclass) THEN
    CREATE POLICY "HR can delete users" ON users FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = 'hr');
  END IF;
END $$;
