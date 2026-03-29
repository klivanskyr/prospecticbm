import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
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

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "*, prospects(*), emails(*), templates:template_ids"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Compute stats
  const emails = data.emails || [];
  const stats = {
    total_prospects: data.prospects?.length ?? 0,
    total_emails: emails.length,
    sent: emails.filter((e: { status: string }) => e.status === "sent").length,
    opened: emails.filter((e: { status: string }) => e.status === "opened").length,
    replied: emails.filter((e: { status: string }) => e.status === "replied").length,
    bounced: emails.filter((e: { status: string }) => e.status === "bounced").length,
  };

  return NextResponse.json({ ...data, stats });
}
