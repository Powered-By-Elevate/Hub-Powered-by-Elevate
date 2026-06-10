-- The review-documents / certification-proofs buckets had no INSERT policy
-- (uploads from the app failed with "new row violates row-level security
-- policy" — and the old upload code ignored the error, so review rows saved a
-- pdf_path that pointed at nothing). Add upload + delete policies matching the
-- employee-documents pattern, alongside the read policies from 20260610100000.
-- Safe to re-run.

DROP POLICY IF EXISTS "Authenticated users can upload review documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload review documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-documents');

DROP POLICY IF EXISTS "Authenticated users can delete review documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete review documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'review-documents');

DROP POLICY IF EXISTS "Authenticated users can upload certification proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload certification proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certification-proofs');

DROP POLICY IF EXISTS "Authenticated users can delete certification proofs" ON storage.objects;
CREATE POLICY "Authenticated users can delete certification proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certification-proofs');
