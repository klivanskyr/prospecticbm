export interface User {
  id: string;
  full_name: string;
  plan: "starter" | "growth" | "scale";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "trialing" | "active" | "past_due" | "canceled";
  monthly_prospect_limit: number;
  prospects_used_this_cycle: number;
  cycle_reset_at: string | null;
  gmail_connected: boolean;
  gmail_refresh_token: string | null;
  daily_email_limit: number;
  linkedin_connected: boolean;
  physical_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  website_url: string | null;
  description: string;
  value_proposition: string | null;
  industry: string | null;
  target_market: string | null;
  company_size: string | null;
  differentiators: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcpProfile {
  id: string;
  user_id: string;
  company_id: string | null;
  raw_description: string;
  target_industries: string[] | null;
  target_job_titles: string[] | null;
  target_company_size: string | null;
  target_geography: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  company_id: string | null;
  icp_profile_id: string | null;
  channel: "email" | "linkedin";
  sequence_step: number;
  subject: string | null;
  body: string;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  user_id: string;
  company_id: string | null;
  icp_profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company_name: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  source_url: string | null;
  email_verified: boolean;
  verification_score: number | null;
  status: "new" | "contacted" | "interested" | "not_interested" | "do_not_contact";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  company_id: string | null;
  icp_profile_id: string | null;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  channels: string[];
  total_prospects: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  linkedin_requests_sent: number;
  linkedin_connections_made: number;
  linkedin_messages_sent: number;
  started_at: string | null;
  daily_emails_sent: number;
  daily_linkedin_sent: number;
  daily_reset_at: string | null;
  max_daily_emails: number;
  max_daily_linkedin: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignProspect {
  id: string;
  campaign_id: string;
  prospect_id: string;
  email_step: number;
  email_status: "pending" | "sent" | "opened" | "replied" | "bounced";
  linkedin_step: number;
  linkedin_status: "pending" | "request_sent" | "connected" | "message_sent" | "replied";
  next_email_at: string | null;
  next_linkedin_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachEvent {
  id: string;
  campaign_prospect_id: string;
  user_id: string;
  channel: "email" | "linkedin";
  event_type: string;
  sequence_step: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Unsubscribe {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export const PLAN_LIMITS = {
  starter: { prospects: 100, daily_linkedin: 20 },
  growth: { prospects: 500, daily_linkedin: 25 },
  scale: { prospects: 2000, daily_linkedin: 25 },
} as const;

export const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID!,
  growth: process.env.STRIPE_GROWTH_PRICE_ID!,
  scale: process.env.STRIPE_SCALE_PRICE_ID!,
} as const;
