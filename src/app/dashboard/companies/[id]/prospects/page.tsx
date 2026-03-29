"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Prospect } from "@/lib/types";

export default function CompanyProspectsPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProspects = useCallback(async () => {
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .limit(200);
    setProspects(data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  if (loading) return <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-200 rounded-lg" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#78716C]">{prospects.length} prospect{prospects.length !== 1 ? "s" : ""}</p>

      {prospects.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-[#1C1917] font-medium mb-1">No prospects yet</p>
          <p className="text-[#78716C] text-sm">Create a campaign to discover prospects for this company.</p>
        </div>
      )}

      {prospects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#1C1917]">
                    {[p.first_name, p.last_name].filter(Boolean).join(" ") || "--"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3 text-gray-600">{p.company_name || "--"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.job_title || "--"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "new" ? "bg-blue-100 text-blue-700" :
                      p.status === "interested" ? "bg-green-100 text-green-700" :
                      p.status === "contacted" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
