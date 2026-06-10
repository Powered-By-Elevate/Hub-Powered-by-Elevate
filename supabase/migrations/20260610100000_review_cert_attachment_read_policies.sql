-- Employees and managers can now see their own reviews / check-ins /
-- certifications (content + attachments) in the My-* tabs. The table RLS
-- already allows "view own" on reviews, checkins, certifications, and
-- development_plans, but the storage buckets holding the attachments
-- (review-documents, certification-proofs) were created outside the tracked
-- migrations, so their read policies aren't guaranteed. This makes them
-- explicit, matching the authenticated-read pattern used for
-- employee-documents. Safe to re-run.

INSERT INTO storage.buckets (id, name, public)
VALUES ('review-documents', 'review-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('certification-proofs', 'certification-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can read review documents" ON storage.objects;
CREATE POLICY "Authenticated users can read review documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'review-documents');

DROP POLICY IF EXISTS "Authenticated users can read certification proofs" ON storage.objects;
CREATE POLICY "Authenticated users can read certification proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certification-proofs');
