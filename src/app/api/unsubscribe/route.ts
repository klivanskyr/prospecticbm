import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const userId = searchParams.get("userId");

  if (!email || !userId) {
    return new NextResponse(
      html("Invalid Request", "Missing required parameters."),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Validate the userId exists before acting on it
  const { data: userExists } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (!userExists) {
    return new NextResponse(
      html("Invalid Request", "Invalid unsubscribe link."),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // Update prospect status to do_not_contact
    await supabaseAdmin
      .from("prospects")
      .update({ status: "do_not_contact" })
      .eq("email", email)
      .eq("user_id", userId);

    // Add to unsubscribes table
    await supabaseAdmin
      .from("unsubscribes")
      .upsert(
        { user_id: userId, email },
        { onConflict: "user_id,email" }
      );

    // Cancel any pending outreach for this prospect
    const { data: prospects } = await supabaseAdmin
      .from("prospects")
      .select("id")
      .eq("email", email)
      .eq("user_id", userId);

    if (prospects?.length) {
      const prospectIds = prospects.map((p: { id: string }) => p.id);
      await supabaseAdmin
        .from("campaign_prospects")
        .update({ email_status: "bounced", next_email_at: null, next_linkedin_at: null })
        .in("prospect_id", prospectIds);
    }

    return new NextResponse(
      html(
        "Unsubscribed",
        "You have been successfully unsubscribed. You will no longer receive emails from us."
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return new NextResponse(
      html("Error", "Something went wrong. Please try again later."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function html(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ProspectICBM</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #FFFBEB; color: #1C1917; }
    .container { text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; }
    h1 { margin-bottom: 0.5rem; }
    p { color: #78716C; line-height: 1.6; }
  </style>
</head>
<body><div class="container"><h1>${title}</h1><p>${message}</p></div></body>
</html>`;
}
