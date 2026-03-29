import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");

  let query = supabase
    .from("templates")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .order("channel")
    .order("sequence_step", { ascending: true });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: company } = await supabase.from("companies").select("id").eq("id", companyId).eq("user_id", user.id).single();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const body = await request.json();
  const { templates } = body;

  if (!templates || !Array.isArray(templates) || templates.length === 0) {
    return NextResponse.json({ error: "Templates array is required" }, { status: 400 });
  }

  const rows = templates.map((t: { channel: string; sequence_step: number; subject?: string; body: string }) => ({
    user_id: user.id,
    company_id: companyId,
    channel: t.channel,
    sequence_step: t.sequence_step,
    subject: t.subject || null,
    body: t.body,
    is_ai_generated: true,
  }));

  const { data, error } = await supabaseAdmin.from("templates").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
