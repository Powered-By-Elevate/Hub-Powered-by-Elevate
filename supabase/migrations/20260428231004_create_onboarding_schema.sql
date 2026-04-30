/*
  # OnboardTrueNorth — Full Schema

  ## New Tables
  - `users` — auth mirror with role (hr | employee), linked to auth.users
  - `employees` — new hire profiles with status and progress
  - `onboarding_tasks` — tasks assigned to each employee
  - `onboarding_templates` — reusable template definitions
  - `template_tasks` — tasks belonging to a template
  - `documents` — shared document library
  - `schedules` — per-employee schedule items
  - `contacts` — global key contacts
  - `activity_log` — audit trail of onboarding actions
  - `setup_tokens` — one-time tokens for employee account setup flow

  ## Security
  - RLS enabled on every table
  - HR users can read/write everything
  - Employees can only read/write their own data
  - Setup tokens are accessible by anon (for setup page) but expire after use
*/

-- ============================================================
-- USERS (profile table mirroring auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('hr', 'employee')),
  employee_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "HR can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'Employee',
  department text NOT NULL DEFAULT 'General',
  manager text NOT NULL DEFAULT 'TBD',
  start_date text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started','in-progress','complete','overdue')),
  progress integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "HR can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- ONBOARDING TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'document' CHECK (category IN ('document','training','form','meeting')),
  due_date text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in-progress','complete','overdue')),
  required boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all tasks"
  ON onboarding_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "Employees can view own tasks"
  ON onboarding_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can insert tasks"
  ON onboarding_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update tasks"
  ON onboarding_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "Employees can update own tasks"
  ON onboarding_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can delete tasks"
  ON onboarding_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- ONBOARDING TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL DEFAULT 'All Departments',
  description text DEFAULT '',
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON onboarding_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can insert templates"
  ON onboarding_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update templates"
  ON onboarding_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can delete templates"
  ON onboarding_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- TEMPLATE TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'document' CHECK (category IN ('document','training','form','meeting')),
  required boolean NOT NULL DEFAULT false,
  days_from_start integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view template tasks"
  ON template_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can insert template tasks"
  ON template_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update template tasks"
  ON template_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can delete template tasks"
  ON template_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'pdf' CHECK (type IN ('pdf','doc','form')),
  file_url text DEFAULT '',
  size_label text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  time_label text DEFAULT '',
  location text DEFAULT '',
  color text DEFAULT '#1B3F6E',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "Employees can view own schedule"
  ON schedules FOR SELECT
  TO authenticated
  USING (
    employee_id IS NULL OR
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can insert schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update schedules"
  ON schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can delete schedules"
  ON schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can insert activity log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "Employees can insert own activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid()
    )
  );

-- ============================================================
-- SETUP TOKENS (for invite flow)
-- ============================================================
CREATE TABLE IF NOT EXISTS setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  email text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE setup_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tokens selectable by anyone to support setup page"
  ON setup_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "HR can insert tokens"
  ON setup_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "HR can update tokens"
  ON setup_tokens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'hr')
  );

CREATE POLICY "Service role can update tokens"
  ON setup_tokens FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee_id ON onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_id ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_employee_id ON activity_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_setup_tokens_token ON setup_tokens(token);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
