/*
  # Seed Demo Data

  Inserts:
  - Documents (6 records)
  - Contacts (3 records)
  - Schedules (global Day 1 items, employee_id = NULL)
  - Onboarding templates (4 with tasks)
  - Demo employees (5 records with tasks)

  Note: Auth users are created via the application auth flow.
  Employee user_id links are set when accounts are activated.
*/

-- ============================================================
-- DOCUMENTS
-- ============================================================
INSERT INTO documents (name, type, size_label) VALUES
  ('Employee Handbook 2024', 'pdf', '2.4 MB'),
  ('Benefits Enrollment Guide', 'pdf', '1.1 MB'),
  ('IT Security Policy', 'doc', '890 KB'),
  ('Code of Conduct', 'pdf', '620 KB'),
  ('NDA Agreement', 'form', '340 KB'),
  ('Benefits Enrollment Form', 'form', '280 KB')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CONTACTS
-- ============================================================
INSERT INTO contacts (name, role, email, phone) VALUES
  ('Alex Rivera', 'HR Manager', 'a.rivera@true-north-companies.com', '(555) 010-0001'),
  ('Priya Patel', 'Engineering Lead', 'p.patel@true-north-companies.com', '(555) 010-0002'),
  ('IT Help Desk', 'Technical Support', 'it@true-north-companies.com', '(555) 010-0099')
ON CONFLICT DO NOTHING;

-- ============================================================
-- GLOBAL DAY 1 SCHEDULE (employee_id IS NULL = shared)
-- ============================================================
INSERT INTO schedules (employee_id, title, time_label, location, color) VALUES
  (NULL, 'Welcome Breakfast', '9:00 AM', 'Café, Building A', '#1B3F6E'),
  (NULL, 'IT Setup and Equipment', '10:00 AM', 'IT Desk 3B', '#2563EB'),
  (NULL, 'Team Lunch', '12:00 PM', 'Main Cafeteria', '#2D9A60'),
  (NULL, 'HR Orientation', '2:00 PM', 'Conference Room A', '#D97706'),
  (NULL, 'Meet Your Manager', '3:30 PM', 'Manager''s Office', '#DC2626')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TEMPLATES
-- ============================================================
WITH t1 AS (
  INSERT INTO onboarding_templates (name, department, description, used_count)
  VALUES ('Standard Onboarding', 'All Departments', 'Covers HR paperwork, IT setup, benefits enrollment, and company culture introduction.', 4)
  RETURNING id
)
INSERT INTO template_tasks (template_id, title, category, required, days_from_start)
SELECT t1.id, v.title, v.cat, v.req, v.days FROM t1, (VALUES
  ('Sign offer letter and NDA', 'document', true, 1),
  ('IT equipment setup and account creation', 'training', true, 1),
  ('Complete benefits enrollment form', 'form', true, 3),
  ('Building and badge access setup', 'training', true, 2),
  ('Complete payroll direct deposit form', 'form', true, 5),
  ('Review employee handbook', 'document', true, 7),
  ('Review code of conduct', 'document', true, 7),
  ('IT security policy acknowledgment', 'form', true, 10),
  ('Introductory meeting with HR', 'meeting', true, 2),
  ('Meet your manager and team', 'meeting', true, 3),
  ('30-day check-in with manager', 'meeting', false, 30),
  ('90-day review with HR', 'meeting', false, 90)
) AS v(title, cat, req, days);

WITH t2 AS (
  INSERT INTO onboarding_templates (name, department, description, used_count)
  VALUES ('Engineering Track', 'Engineering', 'Development environment, code review standards, architecture overview, and tooling setup.', 2)
  RETURNING id
)
INSERT INTO template_tasks (template_id, title, category, required, days_from_start)
SELECT t2.id, v.title, v.cat, v.req, v.days FROM t2, (VALUES
  ('Sign offer letter and NDA', 'document', true, 1),
  ('Development environment setup', 'training', true, 2),
  ('GitHub and repository access', 'training', true, 2),
  ('Complete benefits enrollment form', 'form', true, 3),
  ('Jira and project management tool access', 'training', true, 3),
  ('Code review standards training', 'training', true, 7),
  ('Architecture overview session', 'meeting', true, 5),
  ('Meet engineering team', 'meeting', true, 3),
  ('Review coding style guide', 'document', true, 7),
  ('Complete first pull request review', 'training', true, 14),
  ('Security and access control training', 'training', true, 10),
  ('On-call rotation onboarding', 'training', false, 21),
  ('Product roadmap overview with PM', 'meeting', false, 14),
  ('Deploy first staging change', 'training', false, 21),
  ('30-day engineering check-in', 'meeting', false, 30),
  ('90-day performance review', 'meeting', false, 90)
) AS v(title, cat, req, days);

WITH t3 AS (
  INSERT INTO onboarding_templates (name, department, description, used_count)
  VALUES ('Sales Onboarding', 'Sales', 'CRM training, product demos, territory assignments, and customer engagement basics.', 0)
  RETURNING id
)
INSERT INTO template_tasks (template_id, title, category, required, days_from_start)
SELECT t3.id, v.title, v.cat, v.req, v.days FROM t3, (VALUES
  ('Sign offer letter and NDA', 'document', true, 1),
  ('Complete benefits enrollment form', 'form', true, 3),
  ('CRM system training and access', 'training', true, 3),
  ('Product demo certification', 'training', true, 10),
  ('Territory and quota assignment review', 'meeting', true, 5),
  ('Review sales playbook', 'document', true, 7),
  ('Shadow a senior sales call', 'training', true, 14),
  ('Meet sales leadership', 'meeting', true, 5),
  ('Commission structure review', 'document', true, 7),
  ('30-day sales pipeline review', 'meeting', false, 30)
) AS v(title, cat, req, days);

WITH t4 AS (
  INSERT INTO onboarding_templates (name, department, description, used_count)
  VALUES ('Leadership Track', 'Management', 'People management, executive introductions, strategy alignment, and team onboarding.', 0)
  RETURNING id
)
INSERT INTO template_tasks (template_id, title, category, required, days_from_start)
SELECT t4.id, v.title, v.cat, v.req, v.days FROM t4, (VALUES
  ('Sign offer letter and NDA', 'document', true, 1),
  ('Complete benefits enrollment form', 'form', true, 3),
  ('Executive leadership introductions', 'meeting', true, 3),
  ('Review company strategy and OKRs', 'document', true, 7),
  ('Meet direct reports individually', 'meeting', true, 5),
  ('HR policies and people management training', 'training', true, 7),
  ('Budget and resource planning overview', 'meeting', true, 10),
  ('30-day leadership check-in', 'meeting', false, 30),
  ('90-day strategy alignment review', 'meeting', false, 90)
) AS v(title, cat, req, days);

-- ============================================================
-- EMPLOYEES & TASKS
-- ============================================================

-- Sarah Chen
WITH e1 AS (
  INSERT INTO employees (name, email, phone, role, department, manager, start_date, status, progress)
  VALUES ('Sarah Chen', 'sarah.chen@true-north-companies.com', '(555) 010-1001', 'UX Designer', 'Product', 'Alex Rivera', 'Feb 5, 2024', 'in-progress', 65)
  RETURNING id
)
INSERT INTO onboarding_tasks (employee_id, title, category, due_date, status, required, notes)
SELECT e1.id, v.title, v.cat, v.due, v.st, v.req, v.notes FROM e1, (VALUES
  ('Sign offer letter and NDA', 'document', 'Feb 6, 2024', 'complete', true, ''),
  ('IT equipment setup and onboarding', 'training', 'Feb 7, 2024', 'complete', true, 'Meet IT team at Desk 3B'),
  ('Complete benefits enrollment', 'form', 'Feb 9, 2024', 'complete', true, ''),
  ('Introductory meeting with UX team', 'meeting', 'Feb 8, 2024', 'complete', false, 'Conference Room B, 10:00 AM'),
  ('Product design system training', 'training', 'Feb 14, 2024', 'in-progress', true, ''),
  ('Review brand guidelines document', 'document', 'Feb 15, 2024', 'pending', true, ''),
  ('30-day check-in with manager', 'meeting', 'Mar 5, 2024', 'pending', false, '')
) AS v(title, cat, due, st, req, notes);

-- Marcus Johnson
WITH e2 AS (
  INSERT INTO employees (name, email, phone, role, department, manager, start_date, status, progress)
  VALUES ('Marcus Johnson', 'marcus.j@true-north-companies.com', '(555) 010-1002', 'Software Engineer', 'Engineering', 'Priya Patel', 'Feb 12, 2024', 'in-progress', 30)
  RETURNING id
)
INSERT INTO onboarding_tasks (employee_id, title, category, due_date, status, required, notes)
SELECT e2.id, v.title, v.cat, v.due, v.st, v.req, v.notes FROM e2, (VALUES
  ('Sign offer letter and NDA', 'document', 'Feb 13, 2024', 'complete', true, ''),
  ('Development environment setup', 'training', 'Feb 14, 2024', 'in-progress', true, 'Engineering onboarding doc shared via email'),
  ('Complete benefits enrollment', 'form', 'Feb 16, 2024', 'pending', true, ''),
  ('Code review standards training', 'training', 'Feb 21, 2024', 'pending', true, ''),
  ('Introductory meeting with engineering team', 'meeting', 'Feb 15, 2024', 'overdue', false, '')
) AS v(title, cat, due, st, req, notes);

-- Aisha Williams
WITH e3 AS (
  INSERT INTO employees (name, email, phone, role, department, manager, start_date, status, progress)
  VALUES ('Aisha Williams', 'aisha.w@true-north-companies.com', '(555) 010-1003', 'Marketing Analyst', 'Marketing', 'Tom Brooks', 'Jan 29, 2024', 'complete', 100)
  RETURNING id
)
INSERT INTO onboarding_tasks (employee_id, title, category, due_date, status, required, notes)
SELECT e3.id, v.title, v.cat, v.due, v.st, v.req, v.notes FROM e3, (VALUES
  ('Sign offer letter and NDA', 'document', 'Jan 30, 2024', 'complete', true, ''),
  ('Marketing tools access and setup', 'training', 'Jan 31, 2024', 'complete', true, ''),
  ('Complete benefits enrollment', 'form', 'Feb 2, 2024', 'complete', true, ''),
  ('Campaign review meeting', 'meeting', 'Feb 5, 2024', 'complete', true, ''),
  ('Brand training module', 'training', 'Feb 8, 2024', 'complete', true, '')
) AS v(title, cat, due, st, req, notes);

-- Devon Park
WITH e4 AS (
  INSERT INTO employees (name, email, phone, role, department, manager, start_date, status, progress)
  VALUES ('Devon Park', 'devon.p@true-north-companies.com', '(555) 010-1004', 'Data Scientist', 'Engineering', 'Priya Patel', 'Feb 19, 2024', 'not-started', 0)
  RETURNING id
)
INSERT INTO onboarding_tasks (employee_id, title, category, due_date, status, required, notes)
SELECT e4.id, v.title, v.cat, v.due, v.st, v.req, v.notes FROM e4, (VALUES
  ('Sign offer letter and NDA', 'document', 'Feb 20, 2024', 'pending', true, ''),
  ('IT equipment setup', 'training', 'Feb 21, 2024', 'pending', true, ''),
  ('Complete benefits enrollment', 'form', 'Feb 23, 2024', 'pending', true, '')
) AS v(title, cat, due, st, req, notes);

-- Olivia Reyes
WITH e5 AS (
  INSERT INTO employees (name, email, phone, role, department, manager, start_date, status, progress)
  VALUES ('Olivia Reyes', 'o.reyes@true-north-companies.com', '(555) 010-1005', 'HR Coordinator', 'HR', 'Alex Rivera', 'Feb 1, 2024', 'overdue', 45)
  RETURNING id
)
INSERT INTO onboarding_tasks (employee_id, title, category, due_date, status, required, notes)
SELECT e5.id, v.title, v.cat, v.due, v.st, v.req, v.notes FROM e5, (VALUES
  ('Sign offer letter and NDA', 'document', 'Feb 2, 2024', 'complete', true, ''),
  ('HRIS system training', 'training', 'Feb 5, 2024', 'complete', true, ''),
  ('Complete benefits enrollment', 'form', 'Feb 7, 2024', 'overdue', true, 'Follow-up email sent Feb 8'),
  ('Payroll system access setup', 'training', 'Feb 9, 2024', 'overdue', true, ''),
  ('HR policy document review', 'document', 'Feb 12, 2024', 'pending', true, '')
) AS v(title, cat, due, st, req, notes);

-- Seed activity log entries
INSERT INTO activity_log (employee_id, action)
SELECT e.id, 'Sarah Chen completed "Design system training"'
FROM employees e WHERE e.email = 'sarah.chen@true-north-companies.com'
LIMIT 1;

INSERT INTO activity_log (employee_id, action)
SELECT e.id, 'Marcus Johnson started "Dev environment setup"'
FROM employees e WHERE e.email = 'marcus.j@true-north-companies.com'
LIMIT 1;

INSERT INTO activity_log (employee_id, action)
SELECT e.id, 'Devon Park account created and ready'
FROM employees e WHERE e.email = 'devon.p@true-north-companies.com'
LIMIT 1;

INSERT INTO activity_log (employee_id, action)
SELECT e.id, 'Olivia Reyes has 2 overdue tasks'
FROM employees e WHERE e.email = 'o.reyes@true-north-companies.com'
LIMIT 1;
