/*
  # Add Office and Construction Departments

  Ensures all required office and construction team departments exist in the departments table.
  Uses INSERT ... ON CONFLICT DO NOTHING so existing rows are preserved.

  New entries (if not already present):
  - Office: Finance, Human Resources, Operations, Marketing, Information Technology, Executive, Legal, Administration
  - Construction: Field Operations, Superintendent Team, Project Management, Estimating, Preconstruction,
    Safety, Quality Control, BIM and Virtual Design, Equipment, Concrete, Ironwork, Carpentry,
    Electrical, Plumbing, General Labor
*/

INSERT INTO departments (name) VALUES
  ('Finance'),
  ('Human Resources'),
  ('Operations'),
  ('Marketing'),
  ('Information Technology'),
  ('Executive'),
  ('Legal'),
  ('Administration'),
  ('Field Operations'),
  ('Superintendent Team'),
  ('Project Management'),
  ('Estimating'),
  ('Preconstruction'),
  ('Safety'),
  ('Quality Control'),
  ('BIM and Virtual Design'),
  ('Equipment'),
  ('Concrete'),
  ('Ironwork'),
  ('Carpentry'),
  ('Electrical'),
  ('Plumbing'),
  ('General Labor')
ON CONFLICT (name) DO NOTHING;
