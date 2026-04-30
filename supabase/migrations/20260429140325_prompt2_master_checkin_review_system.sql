/*
  # Master Check-in & Review Date System

  1. New Tables
    - `company_settings` — key/value store for global HR config (review dates, quarter dates)
  
  2. Modified Tables
    - `quarterly_checkins` — add rating, is_overridden, scheduled_date columns
    - `annual_reviews` — add rating text, is_overridden, scheduled_date columns

  3. Security
    - RLS on company_settings (HR only write, authenticated read)
*/

-- company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can insert company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
  );

CREATE POLICY "HR can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr')
  );

-- Seed default setting keys
INSERT INTO company_settings (setting_key, setting_value) VALUES
  ('annual_review_date', ''),
  ('q1_checkin_date', ''),
  ('q2_checkin_date', ''),
  ('q3_checkin_date', ''),
  ('q4_checkin_date', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Add is_overridden to quarterly_checkins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quarterly_checkins' AND column_name = 'is_overridden'
  ) THEN
    ALTER TABLE quarterly_checkins ADD COLUMN is_overridden boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quarterly_checkins' AND column_name = 'rating'
  ) THEN
    ALTER TABLE quarterly_checkins ADD COLUMN rating text DEFAULT NULL;
  END IF;
END $$;

-- Add is_overridden and rating text to annual_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'annual_reviews' AND column_name = 'is_overridden'
  ) THEN
    ALTER TABLE annual_reviews ADD COLUMN is_overridden boolean DEFAULT false;
  END IF;

  -- rename rating from int to text if needed (add new column)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'annual_reviews' AND column_name = 'rating_label'
  ) THEN
    ALTER TABLE annual_reviews ADD COLUMN rating_label text DEFAULT NULL;
  END IF;
END $$;
