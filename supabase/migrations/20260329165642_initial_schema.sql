-- ============================================================
-- ProspectICBM Initial Schema Migration
-- ============================================================

-- =========================
-- Helper: updated_at trigger function
-- =========================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- 1. users
-- =========================
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  company_name   text,
  company_description text,
  plan           text NOT NULL DEFAULT 'starter'
                   CHECK (plan IN ('starter', 'growth', 'scale')),
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text UNIQUE,
  subscription_status    text DEFAULT 'trialing',
  monthly_prospect_limit integer NOT NULL DEFAULT 100,
  prospects_used_this_cycle integer NOT NULL DEFAULT 0,
  cycle_reset_at         timestamptz,
  gmail_connected        boolean DEFAULT false,
  gmail_refresh_token    text,
  daily_email_limit      integer DEFAULT 50,
  linkedin_connected     boolean DEFAULT false,
  physical_address       text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- 2. icp_profiles
-- =========================
CREATE TABLE public.icp_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  raw_description     text NOT NULL,
  target_industries   text[],
  target_job_titles   text[],
  target_company_size text,
  target_geography    text[],
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TRIGGER icp_profiles_updated_at
  BEFORE UPDATE ON public.icp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- 3. templates
-- =========================
CREATE TABLE public.templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  icp_profile_id  uuid REFERENCES public.icp_profiles(id) ON DELETE SET NULL,
  channel         text NOT NULL CHECK (channel IN ('email', 'linkedin')),
  sequence_step   integer NOT NULL,
  subject         text,
  body            text NOT NULL,
  is_ai_generated boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- 4. prospects
-- =========================
CREATE TABLE public.prospects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  icp_profile_id    uuid REFERENCES public.icp_profiles(id) ON DELETE SET NULL,
  first_name        text,
  last_name         text,
  email             text NOT NULL,
  company_name      text,
  job_title         text,
  linkedin_url      text,
  source_url        text,
  email_verified    boolean DEFAULT false,
  verification_score integer,
  status            text DEFAULT 'new'
                      CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'do_not_contact')),
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_prospects_user_email ON public.prospects (user_id, email);
CREATE INDEX idx_prospects_user_status ON public.prospects (user_id, status);
CREATE INDEX idx_prospects_user_icp ON public.prospects (user_id, icp_profile_id);

CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- 5. campaigns
-- =========================
CREATE TABLE public.campaigns (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  icp_profile_id            uuid REFERENCES public.icp_profiles(id) ON DELETE SET NULL,
  name                      text NOT NULL,
  status                    text DEFAULT 'draft'
                              CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  channels                  text[] NOT NULL,
  total_prospects            integer DEFAULT 0,
  emails_sent                integer DEFAULT 0,
  emails_opened              integer DEFAULT 0,
  emails_replied             integer DEFAULT 0,
  linkedin_requests_sent     integer DEFAULT 0,
  linkedin_connections_made  integer DEFAULT 0,
  linkedin_messages_sent     integer DEFAULT 0,
  started_at                 timestamptz,
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- 6. campaign_prospects
-- =========================
CREATE TABLE public.campaign_prospects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prospect_id      uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  email_step       integer DEFAULT 0,
  email_status     text DEFAULT 'pending',
  linkedin_step    integer DEFAULT 0,
  linkedin_status  text DEFAULT 'pending',
  next_email_at    timestamptz,
  next_linkedin_at timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_campaign_prospects_unique ON public.campaign_prospects (campaign_id, prospect_id);

CREATE TRIGGER campaign_prospects_updated_at
  BEFORE UPDATE ON public.campaign_prospects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- 7. outreach_events
-- =========================
CREATE TABLE public.outreach_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_prospect_id  uuid NOT NULL REFERENCES public.campaign_prospects(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel               text NOT NULL CHECK (channel IN ('email', 'linkedin')),
  event_type            text NOT NULL,
  sequence_step         integer NOT NULL,
  metadata              jsonb DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_outreach_events_cp_created ON public.outreach_events (campaign_prospect_id, created_at);
CREATE INDEX idx_outreach_events_user_created ON public.outreach_events (user_id, created_at);

-- =========================
-- 8. unsubscribes
-- =========================
CREATE TABLE public.unsubscribes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_unsubscribes_user_email ON public.unsubscribes (user_id, email);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unsubscribes ENABLE ROW LEVEL SECURITY;

-- users policies (uses id instead of user_id since id IS the user's id)
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (id = auth.uid());

-- icp_profiles policies
CREATE POLICY "icp_profiles_select_own" ON public.icp_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "icp_profiles_insert_own" ON public.icp_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "icp_profiles_update_own" ON public.icp_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "icp_profiles_delete_own" ON public.icp_profiles FOR DELETE USING (user_id = auth.uid());

-- templates policies
CREATE POLICY "templates_select_own" ON public.templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "templates_insert_own" ON public.templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates_update_own" ON public.templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "templates_delete_own" ON public.templates FOR DELETE USING (user_id = auth.uid());

-- prospects policies
CREATE POLICY "prospects_select_own" ON public.prospects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "prospects_insert_own" ON public.prospects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prospects_update_own" ON public.prospects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "prospects_delete_own" ON public.prospects FOR DELETE USING (user_id = auth.uid());

-- campaigns policies
CREATE POLICY "campaigns_select_own" ON public.campaigns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "campaigns_insert_own" ON public.campaigns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "campaigns_update_own" ON public.campaigns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "campaigns_delete_own" ON public.campaigns FOR DELETE USING (user_id = auth.uid());

-- campaign_prospects policies (ownership checked via campaigns join)
CREATE POLICY "campaign_prospects_select_own" ON public.campaign_prospects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "campaign_prospects_insert_own" ON public.campaign_prospects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "campaign_prospects_update_own" ON public.campaign_prospects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "campaign_prospects_delete_own" ON public.campaign_prospects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );

-- outreach_events policies
CREATE POLICY "outreach_events_select_own" ON public.outreach_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "outreach_events_insert_own" ON public.outreach_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "outreach_events_update_own" ON public.outreach_events FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "outreach_events_delete_own" ON public.outreach_events FOR DELETE USING (user_id = auth.uid());

-- unsubscribes policies
CREATE POLICY "unsubscribes_select_own" ON public.unsubscribes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "unsubscribes_insert_own" ON public.unsubscribes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "unsubscribes_update_own" ON public.unsubscribes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "unsubscribes_delete_own" ON public.unsubscribes FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Auth trigger: auto-create public.users row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
