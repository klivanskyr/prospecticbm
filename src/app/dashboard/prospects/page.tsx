"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge, prospectStatusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import type { Prospect } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "do_not_contact", label: "Do not contact" },
];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const supabase = createClient();

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setProspects(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const handleDiscover = async () => {
    setDiscovering(true);
    setQuotaError(null);
    try {
      // Get active ICP
      const { data: icp } = await supabase
        .from("icp_profiles")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!icp) {
        setError("No ICP profile found. Complete onboarding first.");
        setDiscovering(false);
        return;
      }

      const res = await fetch("/api/prospects/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icpProfileId: icp.id, maxProspects: 10 }),
      });

      const body = await res.json();

      if (res.status === 402) {
        setQuotaError(body.error);
        setDiscovering(false);
        return;
      }

      if (!res.ok) {
        throw new Error(body.error || "Discovery failed");
      }

      setQuotaRemaining(body.prospects_remaining);
      // Wait a moment for Inngest to process, then refresh
      setTimeout(() => fetchProspects(), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your leads and discover new ones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/prospects/export"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#DC2626] px-4 py-2 text-sm font-semibold text-[#DC2626] transition-colors hover:bg-red-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </a>
          <Button onClick={handleDiscover} disabled={discovering}>
            {discovering ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Discovering...
              </>
            ) : (
              <>Discover Prospects{quotaRemaining !== null ? ` (${quotaRemaining} left)` : ""}</>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-red-500/20"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {loading ? "Loading..." : `${prospects.length} prospect${prospects.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Quota Error */}
      {quotaError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
          <span>{quotaError}</span>
          <a
            href="/dashboard/settings"
            className="ml-4 inline-block bg-[#DC2626] text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-red-700 transition whitespace-nowrap"
          >
            Upgrade Plan
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

              {!loading && prospects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto max-w-sm space-y-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-12 w-12 text-gray-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <p className="text-gray-500">
                        No prospects yet. Run a discovery to find leads matching
                        your ICP.
                      </p>
                      <Button size="sm" onClick={handleDiscover} disabled={discovering}>
                        Discover Prospects
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                prospects.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => setSelectedProspect(p)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {[p.first_name, p.last_name].filter(Boolean).join(" ") || "--"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.email}</td>
                    <td className="px-4 py-3 text-gray-600">{p.company_name || "--"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.job_title || "--"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={prospectStatusVariant[p.status] ?? "gray"}>
                        {formatStatus(p.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProspect(p);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        open={!!selectedProspect}
        onClose={() => setSelectedProspect(null)}
        title="Prospect Details"
      >
        {selectedProspect && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Name</p>
                <p className="text-sm text-gray-900">
                  {[selectedProspect.first_name, selectedProspect.last_name]
                    .filter(Boolean)
                    .join(" ") || "--"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{selectedProspect.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Company</p>
                <p className="text-sm text-gray-900">{selectedProspect.company_name || "--"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Job Title</p>
                <p className="text-sm text-gray-900">{selectedProspect.job_title || "--"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Status</p>
                <Badge variant={prospectStatusVariant[selectedProspect.status] ?? "gray"}>
                  {formatStatus(selectedProspect.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Email Verified</p>
                <p className="text-sm text-gray-900">{selectedProspect.email_verified ? "Yes" : "No"}</p>
              </div>
            </div>

            {selectedProspect.linkedin_url && (
              <div>
                <p className="text-xs font-medium text-gray-500">LinkedIn</p>
                <a
                  href={selectedProspect.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#DC2626] underline"
                >
                  {selectedProspect.linkedin_url}
                </a>
              </div>
            )}

            {selectedProspect.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500">Notes</p>
                <p className="text-sm text-gray-700">{selectedProspect.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setSelectedProspect(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
