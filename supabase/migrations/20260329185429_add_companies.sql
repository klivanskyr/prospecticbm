-- Create companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  website_url text,
  description text NOT NULL,
  value_proposition text,
  industry text,
  target_market text,
  company_size text,
  differentiators text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_companies_user_id ON companies(user_id);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies" ON companies FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own companies" ON companies FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own companies" ON companies FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own companies" ON companies FOR DELETE USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add company_id to icp_profiles
ALTER TABLE icp_profiles ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX idx_icp_profiles_company_id ON icp_profiles(company_id);

-- Add company_id to templates
ALTER TABLE templates ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX idx_templates_company_id ON templates(company_id);

-- Add company_id to prospects
ALTER TABLE prospects ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX idx_prospects_company_id ON prospects(company_id);

-- Add company_id to campaigns
ALTER TABLE campaigns ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX idx_campaigns_company_id ON campaigns(company_id);

-- Remove company fields from users table (moved to companies)
ALTER TABLE users DROP COLUMN IF EXISTS company_name;
ALTER TABLE users DROP COLUMN IF EXISTS company_description;
