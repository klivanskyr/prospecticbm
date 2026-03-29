"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Company, IcpProfile, Campaign, Prospect } from "@/lib/types";

type Tab = "overview" | "icps" | "prospects" | "campaigns";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [icps, setIcps] = useState<IcpProfile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    const { data } = await supabase.from("companies").select("*").eq("id", id).single();
    setCompany(data);
    setLoading(false);
  }, [id]);

  const fetchIcps = useCallback(async () => {
    const { data } = await supabase.from("icp_profiles").select("*").eq("company_id", id).order("created_at", { ascending: false });
    setIcps(data || []);
  }, [id]);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase.from("campaigns").select("*").eq("company_id", id).order("created_at", { ascending: false });
    setCampaigns(data || []);
  }, [id]);

  const fetchProspects = useCallback(async () => {
    const { data } = await supabase.from("prospects").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(100);
    setProspects(data || []);
  }, [id]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);
  useEffect(() => {
    if (tab === "icps") fetchIcps();
    if (tab === "campaigns") fetchCampaigns();
    if (tab === "prospects") fetchProspects();
  }, [tab, fetchIcps, fetchCampaigns, fetchProspects]);

  async function handleDelete() {
    if (!confirm("Delete this company and all its data? This cannot be undone.")) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin h-8 w-8 border-4 border-[#DC2626] border-t-transparent rounded-full" /></div>;
  if (!company) return <div className="text-center py-20"><p className="text-[#78716C]">Company not found.</p></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "icps", label: "ICPs" },
    { key: "prospects", label: "Prospects" },
    { key: "campaigns", label: "Campaigns" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-[#78716C] hover:text-[#DC2626] transition mb-2 inline-block">&larr; All Companies</Link>
          <h1 className="text-2xl font-bold text-[#1C1917]">{company.name}</h1>
          {company.industry && <p className="text-sm text-[#78716C] mt-1">{company.industry}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/companies/${id}/edit`} className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-[#DC2626] hover:text-[#DC2626] transition">Edit</Link>
          <button onClick={handleDelete} className="px-4 py-2 border-2 border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition">Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`pb-3 text-sm font-medium transition border-b-2 ${tab === t.key ? "border-[#DC2626] text-[#DC2626]" : "border-transparent text-[#78716C] hover:text-[#1C1917]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-xs font-medium text-[#78716C]">Description</p><p className="text-sm text-[#1C1917] mt-1">{company.description}</p></div>
            {company.value_proposition && <div><p className="text-xs font-medium text-[#78716C]">Value Proposition</p><p className="text-sm text-[#1C1917] mt-1">{company.value_proposition}</p></div>}
            {company.target_market && <div><p className="text-xs font-medium text-[#78716C]">Target Market</p><p className="text-sm text-[#1C1917] mt-1">{company.target_market}</p></div>}
            {company.company_size && <div><p className="text-xs font-medium text-[#78716C]">Company Size</p><p className="text-sm text-[#1C1917] mt-1">{company.company_size}</p></div>}
            {company.differentiators && <div><p className="text-xs font-medium text-[#78716C]">Differentiators</p><p className="text-sm text-[#1C1917] mt-1">{company.differentiators}</p></div>}
            {company.website_url && <div><p className="text-xs font-medium text-[#78716C]">Website</p><a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#DC2626] hover:underline mt-1 inline-block">{company.website_url}</a></div>}
          </div>
        </div>
      )}

      {tab === "icps" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#78716C]">{icps.length} saved ICP{icps.length !== 1 ? "s" : ""}</p>
            <Link href={`/dashboard/companies/${id}/campaigns/new`} className="bg-[#DC2626] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">Create ICP</Link>
          </div>
          {icps.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><p className="text-[#78716C]">No ICPs yet. Create one to start targeting prospects.</p></div>}
          {icps.map((icp) => (
            <div key={icp.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-[#1C1917] mb-2">{icp.raw_description}</p>
              <div className="flex flex-wrap gap-2">
                {icp.target_industries?.map((i) => <span key={i} className="px-2 py-0.5 bg-red-50 text-[#DC2626] text-xs rounded-full">{i}</span>)}
                {icp.target_job_titles?.map((t) => <span key={t} className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full">{t}</span>)}
                {icp.target_geography?.map((g) => <span key={g} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{g}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "prospects" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#78716C]">{prospects.length} prospect{prospects.length !== 1 ? "s" : ""}</p>
          </div>
          {prospects.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><p className="text-[#78716C]">No prospects yet. Create a campaign to discover prospects.</p></div>}
          {prospects.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead><tr className="border-b bg-gray-50"><th className="px-4 py-3 font-medium text-gray-600">Name</th><th className="px-4 py-3 font-medium text-gray-600">Email</th><th className="px-4 py-3 font-medium text-gray-600">Company</th><th className="px-4 py-3 font-medium text-gray-600">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {prospects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#1C1917]">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "--"}</td>
                      <td className="px-4 py-3 text-gray-600">{p.email}</td>
                      <td className="px-4 py-3 text-gray-600">{p.company_name || "--"}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "new" ? "bg-blue-100 text-blue-700" : p.status === "interested" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#78716C]">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
            <Link href={`/dashboard/companies/${id}/campaigns/new`} className="bg-[#DC2626] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">New Campaign</Link>
          </div>
          {campaigns.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><p className="text-[#78716C]">No campaigns yet. Create one to start outreach.</p></div>}
          {campaigns.map((c) => (
            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[#DC2626] transition">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1C1917]">{c.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "paused" ? "bg-yellow-100 text-yellow-700" : c.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{c.status}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-[#78716C]">
                <span>{c.total_prospects} prospects</span>
                <span>{c.emails_sent} emails sent</span>
                <span>{c.emails_replied} replies</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
