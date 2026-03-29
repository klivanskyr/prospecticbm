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
  const status = searchParams.get("status");
  const campaignId = searchParams.get("campaignId");

  let query = supabase
    .from("prospects")
    .select(
      "first_name, last_name, email, company_name, job_title, linkedin_url, industry, company_size, status, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No prospects to export" },
      { status: 404 }
    );
  }

  // Build CSV
  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Company",
    "Job Title",
    "LinkedIn URL",
    "Industry",
    "Company Size",
    "Status",
    "Created At",
  ];

  const rows = data.map((p) =>
    [
      escapeCsv(p.first_name),
      escapeCsv(p.last_name),
      escapeCsv(p.email),
      escapeCsv(p.company_name),
      escapeCsv(p.job_title),
      escapeCsv(p.linkedin_url),
      escapeCsv(p.industry),
      String(p.company_size ?? ""),
      escapeCsv(p.status),
      p.created_at,
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="prospects-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function escapeCsv(value: string | null | undefined): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
