import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Legacy onboarding endpoint — the new flow uses /api/companies + /api/companies/[id]/icps
// Keeping this for backwards compatibility but redirecting to the new flow
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, website_url, value_proposition, industry, target_market, company_size, differentiators, icp_description } = body;

  if (!name || !description) {
    return NextResponse.json({ error: "Company name and description are required" }, { status: 400 });
  }

  // Create company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      user_id: user.id,
      name,
      description,
      website_url: website_url || null,
      value_proposition: value_proposition || null,
      industry: industry || null,
      target_market: target_market || null,
      company_size: company_size || null,
      differentiators: differentiators || null,
    })
    .select()
    .single();

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });

  return NextResponse.json(company, { status: 201 });
}
