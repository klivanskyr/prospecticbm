import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch campaign
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status === "active") {
    return NextResponse.json(
      { error: "Campaign is already active" },
      { status: 400 }
    );
  }

  if (
    !campaign.prospect_ids?.length ||
    !campaign.template_ids?.length
  ) {
    return NextResponse.json(
      { error: "Campaign must have prospects and templates" },
      { status: 400 }
    );
  }

  // Update campaign status
  await supabase
    .from("campaigns")
    .update({ status: "active", launched_at: new Date().toISOString() })
    .eq("id", id);

  // Send Inngest events for each prospect
  const events = campaign.prospect_ids.map((prospectId: string) => ({
    name: "email/send-sequence" as const,
    data: {
      userId: user.id,
      prospectId,
      campaignId: id,
      templateIds: campaign.template_ids,
    },
  }));

  await inngest.send(events);

  return NextResponse.json({
    message: "Campaign launched",
    prospectsQueued: campaign.prospect_ids.length,
  });
}
