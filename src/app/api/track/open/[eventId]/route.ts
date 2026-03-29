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
    const supabase = supabaseAdmin;

    // Update email status to opened
    await supabase
      .from("emails")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("status", "sent"); // Only update if currently "sent"

    // Log the open event
    await supabase.from("email_events").insert({
      email_id: eventId,
      event_type: "open",
      occurred_at: new Date().toISOString(),
    });
  } catch (err) {
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
