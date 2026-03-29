import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyDescription, icpDescription } = await request.json();

  if (!companyDescription || !icpDescription) {
    return NextResponse.json(
      { error: "Company and ICP descriptions are required" },
      { status: 400 }
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a B2B sales expert. Based on the following company and ideal customer descriptions, generate:

1. A structured ICP (Ideal Customer Profile) as JSON with fields: industries (array), company_size_min (number), company_size_max (number), job_titles (array), pain_points (array), budget_range (string), geography (array)

2. Three email templates for a cold outreach sequence (initial, follow-up, break-up) each with "subject" and "body" fields. Use {{first_name}}, {{company_name}}, and {{pain_point}} as placeholders.

Company: ${companyDescription}

Ideal Customer: ${icpDescription}

Respond with valid JSON only in this format:
{
  "icp": { ... },
  "templates": [{ "subject": "...", "body": "..." }, ...]
}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    const parsed = JSON.parse(textBlock.text);

    // Save ICP profile
    await supabase.from("icp_profiles").insert({
      user_id: user.id,
      company_description: companyDescription,
      icp_description: icpDescription,
      industries: parsed.icp.industries,
      company_size_min: parsed.icp.company_size_min,
      company_size_max: parsed.icp.company_size_max,
      job_titles: parsed.icp.job_titles,
      pain_points: parsed.icp.pain_points,
      budget_range: parsed.icp.budget_range,
      geography: parsed.icp.geography,
    });

    // Save templates
    for (const template of parsed.templates) {
      await supabase.from("templates").insert({
        user_id: user.id,
        subject: template.subject,
        body: template.body,
        template_type: "outreach",
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: "Failed to generate ICP and templates" },
      { status: 500 }
    );
  }
}
