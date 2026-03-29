import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get counts for each company
  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      const [{ count: campaignCount }, { count: prospectCount }] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("company_id", company.id),
        supabase.from("prospects").select("*", { count: "exact", head: true }).eq("company_id", company.id),
      ]);
      return { ...company, campaign_count: campaignCount ?? 0, prospect_count: prospectCount ?? 0 };
    })
  );

  if (!companies || companies.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#DC2626]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-2">No companies yet</h2>
          <p className="text-[#78716C] mb-6">Create your first company to start prospecting and running campaigns.</p>
          <Link href="/onboarding" className="inline-block bg-[#DC2626] text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition">
            Create Your First Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Your Companies</h1>
          <p className="text-sm text-[#78716C] mt-1">Manage your businesses and their outreach campaigns.</p>
        </div>
        <Link href="/dashboard/companies/new" className="bg-[#DC2626] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 transition">
          Add Company
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companiesWithCounts.map((company) => (
          <Link
            key={company.id}
            href={`/dashboard/companies/${company.id}`}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#DC2626] hover:shadow-md transition group"
          >
            <h3 className="text-lg font-bold text-[#1C1917] group-hover:text-[#DC2626] transition">{company.name}</h3>
            {company.industry && <p className="text-xs text-[#78716C] mt-1">{company.industry}</p>}
            <p className="text-sm text-[#78716C] mt-2 line-clamp-2">{company.description}</p>
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-lg font-bold text-[#1C1917]">{company.campaign_count}</p>
                <p className="text-xs text-[#78716C]">Campaigns</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#1C1917]">{company.prospect_count}</p>
                <p className="text-xs text-[#78716C]">Prospects</p>
              </div>
              {company.website_url && (
                <div className="ml-auto text-xs text-[#78716C] self-center truncate max-w-[120px]">
                  {company.website_url.replace(/https?:\/\//, "")}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
