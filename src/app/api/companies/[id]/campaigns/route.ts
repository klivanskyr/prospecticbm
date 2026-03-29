import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import { PLAN_LIMITS } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user owns company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "*, campaign_prospects:campaign_prospects(count)"
    )
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user owns company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    name,
    icp_profile_id,
    channels,
    template_ids,
    prospect_ids,
    status = "draft",
  } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Campaign name is required" },
      { status: 400 }
    );
  }

  if (!channels?.length) {
    return NextResponse.json(
      { error: "At least one channel is required" },
      { status: 400 }
    );
  }

  // Get user plan for daily limits
  const { data: userProfile } = await supabase.from("users").select("plan").eq("id", user.id).single();
  const plan = (userProfile?.plan || "starter") as keyof typeof PLAN_LIMITS;
  const dailyEmailLimit = plan === "starter" ? 5 : plan === "growth" ? 25 : 100;
  const dailyLinkedinLimit = plan === "starter" ? 5 : plan === "growth" ? 25 : 100;

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      company_id: companyId,
      name: name.trim(),
      icp_profile_id: icp_profile_id || null,
      channels,
      status,
      max_daily_emails: dailyEmailLimit,
      max_daily_linkedin: dailyLinkedinLimit,
    })
    .select()
    .single();

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  // If launched immediately, trigger the autonomous pipeline
  if (status === "active" && campaign) {
    await inngest.send({
      name: "campaign/run",
      data: {
        campaignId: campaign.id,
        userId: user.id,
        companyId,
      },
    });
  }

  return NextResponse.json(campaign, { status: 201 });
}
