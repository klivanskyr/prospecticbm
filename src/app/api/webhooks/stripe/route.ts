import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { PLAN_LIMITS } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = (session.metadata?.plan ?? "starter") as keyof typeof PLAN_LIMITS;

      if (userId) {
        await supabaseAdmin.from("users").update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan,
          subscription_status: "active",
          monthly_prospect_limit: PLAN_LIMITS[plan]?.prospects ?? 100,
          prospects_used_this_cycle: 0,
          cycle_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from("users").update({
        subscription_status: subscription.status === "active" ? "active" : "past_due",
      }).eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "customer.subscription.deleted": {
      await supabaseAdmin.from("users").update({
        subscription_status: "canceled",
      }).eq("stripe_subscription_id", (event.data.object as Stripe.Subscription).id);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as Record<string, unknown>).subscription as string | null;
      if (subId) {
        await supabaseAdmin.from("users").update({
          prospects_used_this_cycle: 0,
          cycle_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq("stripe_subscription_id", subId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const failedSubId = (invoice as unknown as Record<string, unknown>).subscription as string | null;
      if (failedSubId) {
        await supabaseAdmin.from("users").update({
          subscription_status: "past_due",
        }).eq("stripe_subscription_id", failedSubId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
