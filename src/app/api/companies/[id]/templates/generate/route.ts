import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get company info
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const body = await request.json();
  const { icp_profile_id, channels } = body;

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ error: "Channels are required" }, { status: 400 });
  }

  // Get ICP if provided
  let icpContext = "";
  if (icp_profile_id) {
    const { data: icp } = await supabase
      .from("icp_profiles")
      .select("*")
      .eq("id", icp_profile_id)
      .single();

    if (icp) {
      icpContext = `
Target ICP:
- Industries: ${JSON.stringify(icp.target_industries || [])}
- Job Titles: ${JSON.stringify(icp.target_job_titles || [])}
- Company Size: ${icp.target_company_size || "Any"}
- Geography: ${JSON.stringify(icp.target_geography || [])}
- Description: ${icp.raw_description}`;
    }
  }

  const channelInstructions = [];
  if (channels.includes("email")) {
    channelInstructions.push(`"email_templates": array of 3 objects, each with "sequence_step" (1-3), "subject" (string), and "body" (string). Step 1 is initial cold email, step 2 is follow-up 3 days later, step 3 is polite break-up 5 days later.`);
  }
  if (channels.includes("linkedin")) {
    channelInstructions.push(`"linkedin_templates": array of 2 objects, each with "sequence_step" (1-2) and "body" (string). Step 1 is connection request note (MUST be under 300 characters), step 2 is follow-up DM after connection accepted.`);
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are an expert B2B cold outreach copywriter. Generate outreach templates for this company:

Company: ${company.name}
Description: ${company.description}
Value Proposition: ${company.value_proposition || "Not specified"}
Differentiators: ${company.differentiators || "Not specified"}
${icpContext}

Use these placeholders: {{first_name}}, {{company_name}}, {{job_title}}

Return ONLY valid JSON with these fields:
{
  ${channelInstructions.join(",\n  ")}
}

Rules:
- Emails under 150 words each
- LinkedIn connection notes MUST be under 300 characters
- Be direct, no fluff, outcome-focused
- Each follow-up references the previous message
- Final email is a polite break-up
- Sound human, not robotic

Return ONLY the JSON, no other text.`,
      }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const generated = JSON.parse(jsonStr);

    return NextResponse.json(generated);
  } catch (err) {
    console.error("Template generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate templates" },
      { status: 500 }
    );
  }
}
