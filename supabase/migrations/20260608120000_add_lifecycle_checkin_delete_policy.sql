-- Allow HR to delete 30-60-90 (lifecycle) check-ins from the Edit modal.
--
-- quarterly_checkins and annual_reviews already ship "HR can delete" policies
-- (see 20260429132911_expand_employee_hub_schema.sql). The lifecycle_checkins
-- table was created outside the tracked migrations, so its DELETE policy isn't
-- guaranteed. This adds it, matching the same HR-role pattern used everywhere
-- else. Safe to re-run (drops first), and harmless if RLS is disabled on the
-- table (policies only take effect when RLS is on, so this never breaks reads).

DROP POLICY IF EXISTS "HR can delete lifecycle checkins" ON public.lifecycle_checkins;
CREATE POLICY "HR can delete lifecycle checkins"
  ON public.lifecycle_checkins FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hr'));
