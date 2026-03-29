import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "sent"),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "connected"),
    supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "replied"),
    supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["sent", "replied", "opened"]),
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1C1917] mb-2">
            Ready to find more prospects?
          </h2>
          <p className="text-[#78716C] mb-6">
            Launch a new campaign to discover and reach out to your ideal
            customers.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-block bg-[#DC2626] text-white py-3 px-8 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Launch Campaign
          </Link>
        </div>
      </div>
    </div>
  );
}
