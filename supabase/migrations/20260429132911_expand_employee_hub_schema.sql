/*
  # Employee Hub Full Schema Expansion

  Expands the existing onboarding-only schema into a full Employee Hub platform.

  ## New Tables
  - `teams` — sub-groups within departments with an assigned manager
  - `task_comments` — threaded comments on any task
  - `quarterly_checkins` — HR/manager scheduled Q-check-ins per employee
  - `annual_reviews` — annual performance review records per employee
  - `employee_notes` — private HR notes attached to an employee

  ## Modified Tables
  - `users` — add `manager` role option
  - `employees` — add `team_id`, `phase` (onboarding | active), `avatar_url`, `bio`
  - `onboarding_tasks` — rename concept; add `assigned_by`, `document_url`, `document_name`
  - `documents` — add `employee_id` (employee-specific docs), `uploaded_by`
  - `contacts` — add `department`, `is_primary`

  ## Security
  - RLS enabled on all new tables
  - Policies scoped to authenticated users by role/ownership
*/

-- ── teams ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  department  text REFERENCES public.departments(name) ON UPDATE CASCADE,
  manager_id  uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hr')
  );

-- ── Add manager role to users ───────────────────────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('hr', 'manager', 'employee'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Add new columns to employees ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='team_id') THEN
    ALTER TABLE public.employees ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='phase') THEN
    ALTER TABLE public.employees ADD COLUMN phase text NOT NULL DEFAULT 'onboarding' CHECK (phase IN ('onboarding','active'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='avatar_url') THEN
    ALTER TABLE public.employees ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='bio') THEN
    ALTER TABLE public.employees ADD COLUMN bio text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='manager_user_id') THEN
    ALTER TABLE public.employees ADD COLUMN manager_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Add new columns to onboarding_tasks ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='onboarding_tasks' AND column_name='assigned_by') THEN
    ALTER TABLE public.onboarding_tasks ADD COLUMN assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='onboarding_tasks' AND column_name='document_url') THEN
    ALTER TABLE public.onboarding_tasks ADD COLUMN document_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='onboarding_tasks' AND column_name='document_name') THEN
    ALTER TABLE public.onboarding_tasks ADD COLUMN document_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='onboarding_tasks' AND column_name='priority') THEN
    ALTER TABLE public.onboarding_tasks ADD COLUMN priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high'));
  END IF;
END $$;

-- ── Add new columns to documents ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='employee_id') THEN
    ALTER TABLE public.documents ADD COLUMN employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by') THEN
    ALTER TABLE public.documents ADD COLUMN uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='category') THEN
    ALTER TABLE public.documents ADD COLUMN category text NOT NULL DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='visible_to_employee') THEN
    ALTER TABLE public.documents ADD COLUMN visible_to_employee boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ── Add new columns to contacts ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='department') THEN
    ALTER TABLE public.contacts ADD COLUMN department text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='is_primary') THEN
    ALTER TABLE public.contacts ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── task_comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.onboarding_tasks(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view task comments"
  ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert task comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own comments"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors and HR can delete comments"
  ON public.task_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hr')
  );

-- ── quarterly_checkins ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quarterly_checkins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  scheduled_at  date NOT NULL,
  completed_at  date,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue')),
  quarter       text NOT NULL,
  year          integer NOT NULL,
  notes         text,
  conducted_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.quarterly_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR and managers can view all checkins"
  ON public.quarterly_checkins FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "Employees can view own checkins"
  ON public.quarterly_checkins FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid() AND e.id = employee_id
    )
  );
CREATE POLICY "HR can insert checkins"
  ON public.quarterly_checkins FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR can update checkins"
  ON public.quarterly_checkins FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR can delete checkins"
  ON public.quarterly_checkins FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hr')
  );

-- ── annual_reviews ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.annual_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  review_year     integer NOT NULL,
  scheduled_at    date,
  completed_at    date,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in-progress','completed','overdue')),
  rating          integer CHECK (rating BETWEEN 1 AND 5),
  summary         text,
  goals_next_year text,
  conducted_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.annual_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR and managers can view all reviews"
  ON public.annual_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "Employees can view own reviews"
  ON public.annual_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid() AND e.id = employee_id
    )
  );
CREATE POLICY "HR can insert reviews"
  ON public.annual_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR can update reviews"
  ON public.annual_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR can delete reviews"
  ON public.annual_reviews FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hr')
  );

-- ── employee_notes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  pinned      boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR and managers can view notes"
  ON public.employee_notes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
  );
CREATE POLICY "HR and managers can insert notes"
  ON public.employee_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hr','manager'))
    AND auth.uid() = author_id
  );
CREATE POLICY "Authors can update own notes"
  ON public.employee_notes FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "HR can delete notes"
  ON public.employee_notes FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hr')
  );

-- ── indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_checkins_employee_id ON public.quarterly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_annual_reviews_employee_id ON public.annual_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_employee_id ON public.employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_phase ON public.employees(phase);
CREATE INDEX IF NOT EXISTS idx_employees_manager_user_id ON public.employees(manager_user_id);
