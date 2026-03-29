import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export async function POST(
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

  // Update status to active
  await supabase
    .from("campaigns")
    .update({ status: "active", started_at: campaign.started_at || new Date().toISOString() })
    .eq("id", id);

  // Trigger the autonomous pipeline via Inngest
  await inngest.send({
    name: "campaign/run",
    data: {
      campaignId: id,
      userId: user.id,
      companyId: campaign.company_id,
    },
  });

  return NextResponse.json({ message: "Campaign pipeline started" });
}
