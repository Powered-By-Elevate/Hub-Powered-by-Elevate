/*
  # Allow HR to manage user roles

  1. Security Changes
    - Add SELECT policy so HR admins can read all user records
    - Add UPDATE policy so HR admins can change roles on any user record

  2. Notes
    - Previously only users could read/update their own row
    - HR needs to change roles when promoting employees to Manager or HR Admin
*/

CREATE POLICY "HR can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'hr');

CREATE POLICY "HR can update user roles"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'hr')
  WITH CHECK (get_user_role(auth.uid()) = 'hr');
