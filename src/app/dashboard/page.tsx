import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user profile for quota info
  const { data: profile } = await supabase
    .from("users")
    .select("plan, monthly_prospect_limit, prospects_used_this_cycle, cycle_reset_at")
    .eq("id", user.id)
    .single();

  const prospectLimit = profile?.monthly_prospect_limit ?? 100;
  const prospectsUsed = profile?.prospects_used_this_cycle ?? 0;
  const prospectsRemaining = Math.max(0, prospectLimit - prospectsUsed);
  const usagePercent = prospectLimit > 0 ? Math.round((prospectsUsed / prospectLimit) * 100) : 0;
  const plan = profile?.plan ?? "starter";
  const cycleResetAt = profile?.cycle_reset_at;

  const [
    { count: prospectsCount },
    { count: emailsSentCount },
    { count: connectionsCount },
    { count: repliesCount },
    { count: totalSentForRate },
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("outreach_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "sent")
      .eq("channel", "email"),
    supabase
      .from("outreach_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "connected")
      .eq("channel", "linkedin"),
    supabase
      .from("outreach_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "replied"),
    supabase
      .from("outreach_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("channel", "email")
      .in("event_type", ["sent", "replied", "opened"]),
  ]);

  const replyRate =
    totalSentForRate && totalSentForRate > 0
      ? Math.round(((repliesCount ?? 0) / totalSentForRate) * 100)
      : 0;

  const stats = [
    {
      label: "Prospects Found",
      value: prospectsCount ?? 0,
      color: "bg-[#DC2626]",
    },
    {
      label: "Emails Sent",
      value: emailsSentCount ?? 0,
      color: "bg-[#FACC15]",
    },
    {
      label: "Connections",
      value: connectionsCount ?? 0,
      color: "bg-[#DC2626]",
    },
    { label: "Reply Rate", value: `${replyRate}%`, color: "bg-[#FACC15]" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1C1917]">
            Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-[#78716C] mt-1">
            Here&apos;s your prospecting overview
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div
                className={`w-3 h-3 rounded-full ${stat.color} mb-3`}
              />
              <p className="text-sm text-[#78716C]">{stat.label}</p>
              <p className="text-3xl font-bold text-[#1C1917] mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Usage Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[#1C1917]">
              Monthly Prospect Usage — <span className="capitalize">{plan}</span> Plan
            </h3>
            <span className="text-sm text-[#78716C]">
              {prospectsUsed} / {prospectLimit} used
              {cycleResetAt && (
                <span className="ml-2">
                  · Resets {new Date(cycleResetAt).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                usagePercent >= 90
                  ? "bg-[#EF4444]"
                  : usagePercent >= 70
                    ? "bg-[#FACC15]"
                    : "bg-[#10B981]"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {prospectsRemaining === 0 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-[#EF4444] font-medium">
                Monthly limit reached. Upgrade to discover more prospects.
              </p>
              <Link
                href="/dashboard/settings"
                className="text-sm bg-[#DC2626] text-white px-4 py-1.5 rounded-lg font-medium hover:bg-red-700 transition"
              >
                Upgrade Plan
              </Link>
            </div>
          )}
          {prospectsRemaining > 0 && prospectsRemaining <= 20 && (
            <p className="mt-2 text-sm text-[#78716C]">
              {prospectsRemaining} prospects remaining this month
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1C1917] mb-2">
            Ready to find more prospects?
          </h2>
          <p className="text-[#78716C] mb-6">
            Launch a new campaign to discover and reach out to your ideal
            customers.
          </p>
          <Link
            href="/dashboard/campaigns"
            className="inline-block bg-[#DC2626] text-white py-3 px-8 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Launch Campaign
          </Link>
        </div>
      </div>
    </div>
  );
}
