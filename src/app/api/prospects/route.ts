import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "25", 10);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const companyId = searchParams.get("company_id");
  const campaignId = searchParams.get("campaignId");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }

  if (campaignId) {
    // Prospects are linked to campaigns via campaign_prospects junction table
    const { data: cpData } = await supabase
      .from("campaign_prospects")
      .select("prospect_id")
      .eq("campaign_id", campaignId);
    const prospectIds = (cpData || []).map((cp: { prospect_id: string }) => cp.prospect_id);
    if (prospectIds.length > 0) {
      query = query.in("id", prospectIds);
    } else {
      // No prospects in this campaign — return empty
      return NextResponse.json({ prospects: [], total: 0, page, limit, totalPages: 0 });
    }
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    prospects: data,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
