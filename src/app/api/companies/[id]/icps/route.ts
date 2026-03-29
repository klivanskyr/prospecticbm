import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { anthropic } from "@/lib/anthropic";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("icp_profiles")
    .select("*")
    .eq("company_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user owns company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, description")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const body = await request.json();
  const { raw_description } = body;

  if (!raw_description) {
    return NextResponse.json({ error: "ICP description is required" }, { status: 400 });
  }

  // Use Claude to parse ICP description
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are a B2B sales strategist. Parse this ideal customer profile description into structured targeting criteria.

Company context: ${company.name} — ${company.description}

ICP Description: ${raw_description}

Return a JSON object with:
{
  "target_industries": ["industry1", "industry2"],
  "target_job_titles": ["title1", "title2"],
  "target_company_size": "1-50",
  "target_geography": ["US", "Canada"]
}

Return ONLY valid JSON, no other text.`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
  }

  let parsed;
  try {
    const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("icp_profiles")
    .insert({
      user_id: user.id,
      company_id: companyId,
      raw_description,
      target_industries: parsed.target_industries || [],
      target_job_titles: parsed.target_job_titles || [],
      target_company_size: parsed.target_company_size || null,
      target_geography: parsed.target_geography || [],
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
