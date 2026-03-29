"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Campaign } from "@/lib/types";

export default function CompanyCampaignsPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  if (loading) return <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#78716C]">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
        <Link
          href={`/dashboard/companies/${id}/campaigns/new`}
          className="bg-[#DC2626] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
        >
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[#DC2626]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <p className="text-[#1C1917] font-medium mb-1">No campaigns yet</p>
          <p className="text-[#78716C] text-sm mb-4">Create your first campaign to start reaching prospects.</p>
          <Link
            href={`/dashboard/companies/${id}/campaigns/new`}
            className="inline-block bg-[#DC2626] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
          >
            Create Campaign
          </Link>
        </div>
      )}

      {campaigns.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/campaigns/${c.id}`}
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[#DC2626] transition"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1C1917]">{c.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              c.status === "active" ? "bg-green-100 text-green-700" :
              c.status === "paused" ? "bg-yellow-100 text-yellow-700" :
              c.status === "completed" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {c.status}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-[#78716C]">
            <span>{c.total_prospects} prospects</span>
            <span>{c.emails_sent} emails sent</span>
            <span>{c.emails_replied} replies</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
