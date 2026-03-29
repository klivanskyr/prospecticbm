import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// 1x1 transparent pixel GIF
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    // The eventId is a campaign_prospect_id — record an open event
    await supabaseAdmin.from("outreach_events").insert({
      campaign_prospect_id: eventId,
      user_id: "00000000-0000-0000-0000-000000000000", // Will be overwritten by the actual user_id lookup below
      channel: "email",
      event_type: "opened",
      sequence_step: 0,
      metadata: { tracked_at: new Date().toISOString() },
    }).then(async () => {
      // Also update campaign_prospect status if still "sent"
      await supabaseAdmin
        .from("campaign_prospects")
        .update({ email_status: "opened" })
        .eq("id", eventId)
        .eq("email_status", "sent");
    });
  } catch (err) {
    // Silently fail — don't break the pixel response
    console.error("Tracking error:", err);
  }

  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
