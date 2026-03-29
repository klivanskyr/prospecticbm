import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Get campaign prospects with their prospect data
  const { data: campaignProspects } = await supabase
    .from("campaign_prospects")
    .select("*, prospects(*)")
    .eq("campaign_id", id);

  // Get outreach events for stats
  const { data: events } = await supabase
    .from("outreach_events")
    .select("*")
    .eq("user_id", user.id)
    .in("campaign_prospect_id", (campaignProspects || []).map((cp: { id: string }) => cp.id));

  const emailEvents = (events || []).filter((e: { channel: string }) => e.channel === "email");
  const stats = {
    total_prospects: campaignProspects?.length ?? 0,
    emails_sent: emailEvents.filter((e: { event_type: string }) => e.event_type === "sent").length,
    emails_opened: emailEvents.filter((e: { event_type: string }) => e.event_type === "opened").length,
    emails_replied: emailEvents.filter((e: { event_type: string }) => e.event_type === "replied").length,
  };

  return NextResponse.json({ ...campaign, campaign_prospects: campaignProspects || [], stats });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowedFields = ["name", "status", "channels"];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
