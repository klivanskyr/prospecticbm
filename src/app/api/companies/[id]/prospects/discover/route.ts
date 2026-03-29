import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

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

  // Check quota
  const { data: profile } = await supabase
    .from("users")
    .select("plan, monthly_prospect_limit, prospects_used_this_cycle")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 403 }
    );
  }

  const remaining =
    profile.monthly_prospect_limit - profile.prospects_used_this_cycle;

  if (remaining <= 0) {
    return NextResponse.json(
      {
        error:
          "Monthly prospect limit reached. Upgrade your plan to discover more.",
        upgrade_url: "/dashboard/settings",
        prospects_used: profile.prospects_used_this_cycle,
        prospects_limit: profile.monthly_prospect_limit,
        plan: profile.plan,
      },
      { status: 402 }
    );
  }

  const body = await request.json();
  const { icp_profile_id, count = 10 } = body;

  if (!icp_profile_id) {
    return NextResponse.json(
      { error: "ICP profile ID is required" },
      { status: 400 }
    );
  }

  const cappedMax = Math.min(count, remaining);

  await inngest.send({
    name: "prospects/discover",
    data: {
      userId: user.id,
      companyId,
      icpProfileId: icp_profile_id,
      maxProspects: cappedMax,
    },
  });

  return NextResponse.json({
    message: "Prospect discovery started",
    maxProspects: cappedMax,
    prospects_used: profile.prospects_used_this_cycle,
    prospects_limit: profile.monthly_prospect_limit,
    prospects_remaining: remaining - cappedMax,
  });
}
