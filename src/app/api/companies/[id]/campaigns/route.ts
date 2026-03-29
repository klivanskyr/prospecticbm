import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      company_id: companyId,
      name: name.trim(),
      icp_profile_id: icp_profile_id || null,
      channels,
      template_ids: template_ids || [],
      prospect_ids: prospect_ids || [],
      total_prospects: prospect_ids?.length ?? 0,
      status,
    })
    .select()
    .single();

  if (campaignError) {
    return NextResponse.json(
      { error: campaignError.message },
      { status: 500 }
    );
  }

  // Create campaign_prospects junction rows
  if (prospect_ids?.length) {
    const junctionRows = prospect_ids.map((prospectId: string) => ({
      campaign_id: campaign.id,
      prospect_id: prospectId,
      email_status: "pending" as const,
      email_step: 0,
      linkedin_status: "pending" as const,
      linkedin_step: 0,
    }));

    const { error: junctionError } = await supabase
      .from("campaign_prospects")
      .insert(junctionRows);

    if (junctionError) {
      // Campaign was created but junction failed — log but don't fail the whole request
      console.error(
        "Failed to create campaign_prospects:",
        junctionError.message
      );
    }
  }

  return NextResponse.json(campaign, { status: 201 });
}
