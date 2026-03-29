-- Add daily rate limit tracking to campaigns
ALTER TABLE campaigns ADD COLUMN daily_emails_sent integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN daily_linkedin_sent integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN daily_reset_at timestamptz DEFAULT now();
ALTER TABLE campaigns ADD COLUMN max_daily_emails integer DEFAULT 20;
ALTER TABLE campaigns ADD COLUMN max_daily_linkedin integer DEFAULT 10;
