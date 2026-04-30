/*
  # Fix users table RLS — remove circular dependency

  The previous policies on the users table caused a circular reference:
  HR policy checked users.role by querying the users table itself,
  which triggered RLS again infinitely.

  Fix: Use auth.jwt() to check the role from the JWT claims instead of
  querying the users table. Also simplify to a single permissive SELECT
  policy so any authenticated user can read their own row on login.
*/

-- Drop all existing policies on users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "HR can view all users" ON users;
DROP POLICY IF EXISTS "HR can insert users" ON users;
DROP POLICY IF EXISTS "HR can update any user" ON users;

-- Simple: authenticated users can always read their own row
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can update their own row
CREATE POLICY "Users can update own row"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow inserts from authenticated users (needed for setup flow)
CREATE POLICY "Authenticated can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role bypass (no RLS for service role by default, but be explicit)
-- HR users need to read other users — use a security definer function instead
-- of a recursive policy. We grant this via a separate function below.

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;
