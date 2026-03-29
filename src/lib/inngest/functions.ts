import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { anthropic } from "@/lib/anthropic";

// ─── Campaign Orchestrator ───
// Triggered when a campaign is launched. Continuously discovers prospects
// and sends outreach until paused, completed, or quota exhausted.

export const runCampaign = inngest.createFunction(
  {
    id: "run-campaign",
    concurrency: { limit: 10 },
    triggers: [{ event: "campaign/run" }],
  },
  async ({ event, step }) => {
    const { campaignId, userId, companyId } = event.data as {
      campaignId: string;
      userId: string;
      companyId: string;
    };

    // Loop: discover one prospect at a time until stopped
    for (let i = 0; i < 1000; i++) {
      // Check campaign is still active
      const campaign = await step.run(`check-status-${i}`, async () => {
        const { data } = await supabaseAdmin
          .from("campaigns")
          .select("status, daily_emails_sent, max_daily_emails, daily_reset_at")
          .eq("id", campaignId)
          .single();
        return data;
      });

      if (!campaign || campaign.status !== "active") {
        return { stopped: true, reason: "Campaign no longer active", discovered: i };
      }

      // Check daily quota
      const dailyQuotaOk = await step.run(`check-daily-quota-${i}`, async () => {
        // Reset daily counter if it's a new day
        const resetAt = campaign.daily_reset_at ? new Date(campaign.daily_reset_at) : new Date(0);
        const now = new Date();
        if (now.toDateString() !== resetAt.toDateString()) {
          await supabaseAdmin.from("campaigns").update({
            daily_emails_sent: 0,
            daily_linkedin_sent: 0,
            daily_reset_at: now.toISOString(),
          }).eq("id", campaignId);
          return true;
        }
        return campaign.daily_emails_sent < campaign.max_daily_emails;
      });

      if (!dailyQuotaOk) {
        // Wait until tomorrow, then continue
        await step.sleep(`wait-daily-reset-${i}`, "12h");
        continue;
      }

      // Check monthly quota
      const monthlyOk = await step.run(`check-monthly-${i}`, async () => {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("prospects_used_this_cycle, monthly_prospect_limit")
          .eq("id", userId)
          .single();
        return user ? user.prospects_used_this_cycle < user.monthly_prospect_limit : false;
      });

      if (!monthlyOk) {
        return { stopped: true, reason: "Monthly quota exhausted", discovered: i };
      }

      // Discover and send to one prospect
      await step.invoke(`discover-${i}`, {
        function: discoverAndSendToProspect,
        data: { campaignId, userId, companyId },
      });

      // Wait between discoveries (rate limiting)
      await step.sleep(`rate-limit-${i}`, "5m");
    }

    return { completed: true, reason: "Max iterations reached" };
  }
);

// ─── Discover & Send to One Prospect ───
// Finds one matching prospect via Claude web search, then sends the full
// outreach sequence (email step 1, wait, follow-up, wait, break-up).

export const discoverAndSendToProspect = inngest.createFunction(
  {
    id: "discover-and-send",
    concurrency: { limit: 5 },
    triggers: [{ event: "prospect/discover-and-send" }],
  },
  async ({ event, step }) => {
    const { campaignId, userId, companyId } = event.data as {
      campaignId: string;
      userId: string;
      companyId: string;
    };

    // Get campaign, company, and ICP data
    const context = await step.run("fetch-context", async () => {
      const [campaignRes, companyRes] = await Promise.all([
        supabaseAdmin.from("campaigns").select("*, icp_profile_id").eq("id", campaignId).single(),
        supabaseAdmin.from("companies").select("*").eq("id", companyId).single(),
      ]);

      if (!campaignRes.data || !companyRes.data) throw new Error("Campaign or company not found");

      let icp = null;
      if (campaignRes.data.icp_profile_id) {
        const { data } = await supabaseAdmin.from("icp_profiles").select("*").eq("id", campaignRes.data.icp_profile_id).single();
        icp = data;
      }

      // Get already-contacted companies to avoid duplicates
      const { data: existingProspects } = await supabaseAdmin
        .from("prospects")
        .select("company_name")
        .eq("company_id", companyId)
        .not("company_name", "is", null);

      const excludedCompanies = [...new Set((existingProspects || []).map((p: { company_name: string }) => p.company_name))].slice(0, 50);

      return {
        campaign: campaignRes.data,
        company: companyRes.data,
        icp,
        excludedCompanies,
      };
    });

    // Discover one prospect via Claude
    const prospect = await step.run("discover-prospect", async () => {
      const { company, icp, excludedCompanies } = context;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `You are a B2B prospect researcher. Find ONE real person who matches this ICP.

Company selling: ${company.name} — ${company.description}
Value prop: ${company.value_proposition || "Not specified"}

Target profile:
- Industries: ${JSON.stringify(icp?.target_industries || ["technology"])}
- Job titles: ${JSON.stringify(icp?.target_job_titles || ["CEO", "Founder", "VP Sales"])}
- Company size: ${icp?.target_company_size || "1-200"}
- Geography: ${JSON.stringify(icp?.target_geography || ["US"])}
- Description: ${icp?.raw_description || "B2B decision makers"}

DO NOT return anyone from these companies: ${excludedCompanies.join(", ") || "none yet"}

Search the web for a real person. Return ONLY this JSON:
{"first_name":"...","last_name":"...","email":"...","company_name":"...","job_title":"...","linkedin_url":"...","source_url":"..."}

The email MUST be a plausible business email. Return ONLY JSON.`,
        }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("No AI response");
      const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(jsonStr);
    });

    // Check unsubscribes
    const isUnsubscribed = await step.run("check-unsubscribe", async () => {
      const { data } = await supabaseAdmin
        .from("unsubscribes")
        .select("id")
        .eq("user_id", userId)
        .eq("email", prospect.email)
        .single();
      return !!data;
    });

    if (isUnsubscribed) {
      return { skipped: true, reason: "Email is unsubscribed", email: prospect.email };
    }

    // Insert prospect + campaign_prospect
    const prospectRecord = await step.run("insert-prospect", async () => {
      const { data, error } = await supabaseAdmin.from("prospects").insert({
        user_id: userId,
        company_id: companyId,
        icp_profile_id: context.campaign.icp_profile_id,
        first_name: prospect.first_name,
        last_name: prospect.last_name,
        email: prospect.email,
        company_name: prospect.company_name,
        job_title: prospect.job_title,
        linkedin_url: prospect.linkedin_url || null,
        source_url: prospect.source_url || null,
        status: "contacted",
        email_verified: false,
      }).select().single();

      if (error) throw new Error(`Insert failed: ${error.message}`);

      // Create campaign_prospect link
      await supabaseAdmin.from("campaign_prospects").insert({
        campaign_id: campaignId,
        prospect_id: data.id,
        email_status: "pending",
        linkedin_status: "pending",
      });

      // Update counters
      await supabaseAdmin.from("campaigns").update({
        total_prospects: context.campaign.total_prospects + 1,
      }).eq("id", campaignId);

      await supabaseAdmin.rpc("increment_prospects_used", {
        p_user_id: userId,
        p_count: 1,
      });

      return data;
    });

    // Get email templates for this campaign's company
    const templates = await step.run("fetch-templates", async () => {
      const { data } = await supabaseAdmin
        .from("templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("channel", "email")
        .order("sequence_step", { ascending: true })
        .limit(3);
      return data || [];
    });

    // Send email sequence (3 steps with delays)
    for (let emailStep = 0; emailStep < templates.length; emailStep++) {
      if (emailStep > 0) {
        await step.sleep(`email-wait-${emailStep}`, emailStep === 1 ? "3d" : "5d");
      }

      // Re-check campaign is still active before each send
      const stillActive = await step.run(`recheck-${emailStep}`, async () => {
        const { data } = await supabaseAdmin.from("campaigns").select("status").eq("id", campaignId).single();
        return data?.status === "active";
      });

      if (!stillActive) break;

      // Check prospect hasn't replied or unsubscribed
      const shouldSend = await step.run(`check-prospect-${emailStep}`, async () => {
        const { data } = await supabaseAdmin.from("prospects").select("status").eq("id", prospectRecord.id).single();
        return data?.status !== "do_not_contact" && data?.status !== "interested";
      });

      if (!shouldSend) break;

      await step.run(`send-email-${emailStep}`, async () => {
        const template = templates[emailStep];
        const subject = (template.subject || "").replace(/\{\{first_name\}\}/g, prospect.first_name || "").replace(/\{\{company_name\}\}/g, prospect.company_name || "").replace(/\{\{job_title\}\}/g, prospect.job_title || "");
        const body = template.body.replace(/\{\{first_name\}\}/g, prospect.first_name || "").replace(/\{\{company_name\}\}/g, prospect.company_name || "").replace(/\{\{job_title\}\}/g, prospect.job_title || "");

        // Log the outreach event (Gmail sending deferred to when OAuth is connected)
        await supabaseAdmin.from("outreach_events").insert({
          campaign_prospect_id: prospectRecord.id,
          user_id: userId,
          channel: "email",
          event_type: "sent",
          sequence_step: emailStep + 1,
          metadata: { subject, body_preview: body.substring(0, 200), to: prospect.email },
        });

        // Update campaign counters
        await supabaseAdmin.from("campaigns").update({
          emails_sent: context.campaign.emails_sent + emailStep + 1,
          daily_emails_sent: context.campaign.daily_emails_sent + 1,
        }).eq("id", campaignId);

        // Update campaign_prospect status
        await supabaseAdmin.from("campaign_prospects").update({
          email_step: emailStep + 1,
          email_status: "sent",
        }).eq("campaign_id", campaignId).eq("prospect_id", prospectRecord.id);
      });
    }

    return { success: true, prospect: prospect.email };
  }
);

// ─── Daily Quota Reset (Cron) ───
// Runs daily to reset daily send counters for all active campaigns.

export const resetDailyQuotas = inngest.createFunction(
  {
    id: "reset-daily-quotas",
    triggers: [{ cron: "0 0 * * *" }], // Midnight UTC
  },
  async ({ step }) => {
    await step.run("reset", async () => {
      await supabaseAdmin.from("campaigns")
        .update({ daily_emails_sent: 0, daily_linkedin_sent: 0, daily_reset_at: new Date().toISOString() })
        .eq("status", "active");
    });
    return { reset: true };
  }
);
