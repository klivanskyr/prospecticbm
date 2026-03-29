import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check quota
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, prospects_limit, prospects_used")
    .eq("user_id", user.id)
    .single();

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription" },
      { status: 403 }
    );
  }

  if (subscription.prospects_used >= subscription.prospects_limit) {
    return NextResponse.json(
      { error: "Prospect discovery quota exceeded. Please upgrade your plan." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { icpProfileId, maxProspects = 50 } = body;

  if (!icpProfileId) {
    return NextResponse.json(
      { error: "ICP profile ID is required" },
      { status: 400 }
    );
  }

  const remaining = subscription.prospects_limit - subscription.prospects_used;
  const cappedMax = Math.min(maxProspects, remaining);

  // Send Inngest event for async discovery
  await inngest.send({
    name: "prospects/discover",
    data: {
      userId: user.id,
      icpProfileId,
      maxProspects: cappedMax,
    },
  });

  return NextResponse.json({
    message: "Prospect discovery started",
    maxProspects: cappedMax,
  });
}
