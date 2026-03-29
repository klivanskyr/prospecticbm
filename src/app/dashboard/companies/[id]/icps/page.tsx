"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { IcpProfile } from "@/lib/types";

export default function CompanyIcpsPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [icps, setIcps] = useState<IcpProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState("");

  const fetchIcps = useCallback(async () => {
    const { data } = await supabase
      .from("icp_profiles")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    setIcps(data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchIcps(); }, [fetchIcps]);

  async function handleCreate() {
    if (!newDescription.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/companies/${id}/icps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_description: newDescription }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create ICP");
      }
      setNewDescription("");
      fetchIcps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="animate-pulse space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#78716C]">{icps.length} saved ICP{icps.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Create ICP inline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-medium text-[#1C1917]">Create new ICP</p>
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          rows={3}
          placeholder="Describe your ideal customer... e.g., SaaS founders with 10-50 employees in the US"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={creating || !newDescription.trim()}
          className="bg-[#DC2626] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create ICP"}
        </button>
      </div>

      {icps.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-[#78716C]">No ICPs yet. Create one above to start targeting prospects.</p>
        </div>
      )}

      {icps.map((icp) => (
        <div key={icp.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-[#1C1917] mb-2">{icp.raw_description}</p>
          <div className="flex flex-wrap gap-2">
            {icp.target_industries?.map((i) => (
              <span key={i} className="px-2 py-0.5 bg-red-50 text-[#DC2626] text-xs rounded-full">{i}</span>
            ))}
            {icp.target_job_titles?.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full">{t}</span>
            ))}
            {icp.target_geography?.map((g) => (
              <span key={g} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{g}</span>
            ))}
            {icp.target_company_size && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{icp.target_company_size} employees</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
