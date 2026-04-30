/*
  # Expand Documents Table for File Upload Support

  Adds columns needed for full document upload/management:
  - file_path: storage path in Supabase Storage bucket (for signed URL generation)
  - section: logical grouping (Onboarding Documents, HR Forms, Policies, etc.)
  - description: optional HR-provided description
  - requires_acknowledgment: whether employee must acknowledge the document
  - file_size_bytes: raw bytes for display
  - mime_type: MIME type string for view/download decisions
  - display_name: HR-provided label (was 'name', now both exist)

  Also creates the employee-documents storage bucket if it does not exist.
  RLS policy is added so authenticated users can interact with the bucket.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE documents ADD COLUMN file_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'section'
  ) THEN
    ALTER TABLE documents ADD COLUMN section text DEFAULT 'Onboarding Documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'description'
  ) THEN
    ALTER TABLE documents ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'requires_acknowledgment'
  ) THEN
    ALTER TABLE documents ADD COLUMN requires_acknowledgment boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE documents ADD COLUMN file_size_bytes bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN mime_type text;
  END IF;
END $$;

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the storage bucket
CREATE POLICY "Authenticated users can upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can read employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can delete employee documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'employee-documents');
