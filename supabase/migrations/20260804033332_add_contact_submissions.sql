-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact form (anon + authenticated)
DROP POLICY IF EXISTS "contact_insert_any" ON contact_submissions;
CREATE POLICY "contact_insert_any" ON contact_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated can read (admin moderation)
DROP POLICY IF EXISTS "contact_read_auth" ON contact_submissions;
CREATE POLICY "contact_read_auth" ON contact_submissions FOR SELECT
  TO authenticated USING (true);
