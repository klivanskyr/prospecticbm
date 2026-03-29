import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");

  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, company_id, icp_profile_id, channels, prospect_ids, status } = body;

  if (!name) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      company_id: company_id || null,
      icp_profile_id: icp_profile_id || null,
      name,
      channels: channels || ["email"],
      status: status || "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create campaign_prospects junction rows
  if (prospect_ids?.length && campaign) {
    const rows = prospect_ids.map((pid: string) => ({
      campaign_id: campaign.id,
      prospect_id: pid,
    }));
    await supabase.from("campaign_prospects").insert(rows);

    // Update prospect count
    await supabase.from("campaigns").update({ total_prospects: prospect_ids.length }).eq("id", campaign.id);
  }

  return NextResponse.json(campaign, { status: 201 });
}
