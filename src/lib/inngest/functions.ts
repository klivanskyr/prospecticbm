import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { anthropic } from "@/lib/anthropic";

export const discoverProspects = inngest.createFunction(
  {
    id: "discover-prospects",
    concurrency: { limit: 5 },
    triggers: [{ event: "prospects/discover" }],
  },
  async ({ event, step }) => {
    const { userId, companyId, icpProfileId, maxProspects } = event.data as {
      userId: string;
      companyId: string;
      icpProfileId: string;
      maxProspects: number;
    };

    const icpProfile = await step.run("fetch-icp", async () => {
      const { data, error } = await supabaseAdmin
        .from("icp_profiles")
        .select("*")
        .eq("id", icpProfileId)
        .eq("user_id", userId)
        .single();
      if (error) throw new Error(`ICP not found: ${error.message}`);
      return data;
    });

    const prospects = await step.run("generate-prospects", async () => {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You are a B2B prospect researcher. Based on this Ideal Customer Profile, generate ${maxProspects} realistic prospect profiles as a JSON array.

ICP:
- Industries: ${JSON.stringify(icpProfile.target_industries)}
- Job titles: ${JSON.stringify(icpProfile.target_job_titles)}
- Company size: ${icpProfile.target_company_size}
- Geography: ${JSON.stringify(icpProfile.target_geography)}
- Description: ${icpProfile.raw_description}

Each prospect object must have: first_name, last_name, email, company_name, job_title, linkedin_url, source_url

Make the data realistic. Use real company naming patterns and plausible email formats. Return ONLY a valid JSON array, no other text.`,
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("No AI response");
      const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(jsonStr);
    });

    const inserted = await step.run("insert-prospects", async () => {
      const rows = (prospects as Array<Record<string, string>>).map((p) => ({
        user_id: userId,
        company_id: companyId,
        icp_profile_id: icpProfileId,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        company_name: p.company_name,
        job_title: p.job_title,
        linkedin_url: p.linkedin_url,
        source_url: p.source_url ?? "",
        status: "new",
        email_verified: false,
      }));

      const { data, error } = await supabaseAdmin.from("prospects").insert(rows).select();
      if (error) throw new Error(`Insert failed: ${error.message}`);
      return data;
    });

    await step.run("update-quota", async () => {
      await supabaseAdmin.rpc("increment_prospects_used", {
        p_user_id: userId,
        p_count: inserted.length,
      });
    });

    return { discovered: inserted.length };
  }
);

export const sendEmailSequence = inngest.createFunction(
  {
    id: "send-email-sequence",
    concurrency: { limit: 10 },
    triggers: [{ event: "email/send-sequence" }],
  },
  async ({ event, step }) => {
    const { userId, prospectId, campaignId, campaignProspectId } = event.data as {
      userId: string;
      prospectId: string;
      campaignId: string;
      campaignProspectId: string;
    };

    const data = await step.run("fetch-data", async () => {
      const [prospectRes, templateRes, cpRes] = await Promise.all([
        supabaseAdmin.from("prospects").select("*").eq("id", prospectId).single(),
        supabaseAdmin.from("templates").select("*").eq("user_id", userId).eq("channel", "email").order("sequence_step"),
        supabaseAdmin.from("campaign_prospects").select("*").eq("id", campaignProspectId).single(),
      ]);
      if (prospectRes.error) throw new Error(prospectRes.error.message);
      if (templateRes.error) throw new Error(templateRes.error.message);
      if (cpRes.error) throw new Error(cpRes.error.message);
      return { prospect: prospectRes.data, templates: templateRes.data, cp: cpRes.data };
    });

    const { prospect, templates } = data;
    const startStep = data.cp.email_step;

    for (let i = startStep; i < templates.length && i < 3; i++) {
      const template = templates[i];
      if (i > startStep) {
        await step.sleep(`wait-step-${i}`, i === 1 ? "3d" : "5d");
      }

      const shouldContinue = await step.run(`check-status-${i}`, async () => {
        const { data: cp } = await supabaseAdmin.from("campaign_prospects").select("email_status").eq("id", campaignProspectId).single();
        const { data: campaign } = await supabaseAdmin.from("campaigns").select("status").eq("id", campaignId).single();
        return cp?.email_status !== "replied" && campaign?.status === "active";
      });

      if (!shouldContinue) break;

      await step.run(`send-step-${i}`, async () => {
        const subject = (template.subject ?? "").replace(/\{\{first_name\}\}/g, prospect.first_name ?? "").replace(/\{\{company_name\}\}/g, prospect.company_name ?? "");
        const body = template.body.replace(/\{\{first_name\}\}/g, prospect.first_name ?? "").replace(/\{\{company_name\}\}/g, prospect.company_name ?? "").replace(/\{\{job_title\}\}/g, prospect.job_title ?? "");

        // Log the email (Gmail API integration requires user's OAuth tokens — full implementation deferred)
        await supabaseAdmin.from("outreach_events").insert({
          campaign_prospect_id: campaignProspectId,
          user_id: userId,
          channel: "email",
          event_type: "sent",
          sequence_step: i + 1,
          metadata: { subject, body_preview: body.substring(0, 200), to: prospect.email },
        });

        await supabaseAdmin.from("campaign_prospects").update({
          email_step: i + 1,
          email_status: "sent",
          next_email_at: i < 2 ? new Date(Date.now() + (i === 0 ? 3 : 5) * 86400000).toISOString() : null,
        }).eq("id", campaignProspectId);

        await supabaseAdmin.from("campaigns").update({
          emails_sent: data.cp.email_step + i + 1,
        }).eq("id", campaignId);
      });
    }

    return { completed: true, prospectId };
  }
);
