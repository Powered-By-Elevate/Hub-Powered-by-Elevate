/*
  # Force PostgREST schema cache refresh

  This migration makes no functional changes. It adds a comment on the
  manager_id column to ensure PostgREST picks up the column after a prior
  DDL change that was not reflected in the schema cache.
*/

COMMENT ON COLUMN public.employees.manager_id IS 'References the manager employee record';
NOTIFY pgrst, 'reload schema';
