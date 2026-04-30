/*
  # Add acknowledged_at to documents table

  Adds an `acknowledged_at` timestamp to track when an employee
  acknowledged a document that requires acknowledgment.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'acknowledged_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN acknowledged_at timestamptz DEFAULT NULL;
  END IF;
END $$;
