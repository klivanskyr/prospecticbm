"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge, campaignStatusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import type { Campaign, IcpProfile, Prospect } from "@/lib/types";

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse space-y-4">
      <div className="h-5 w-40 rounded bg-gray-200" />
      <div className="h-4 w-24 rounded bg-gray-200" />
      <div className="flex gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-16 rounded bg-gray-200" />
        ))}
      </div>
    </Card>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formIcpId, setFormIcpId] = useState("");
  const [formChannels, setFormChannels] = useState<string[]>(["email"]);
  const [formProspectIds, setFormProspectIds] = useState<string[]>([]);

  // Supporting data for the form
  const [icps, setIcps] = useState<IcpProfile[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);

  const supabase = createClient();

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setCampaigns(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const openCreateModal = async () => {
    setShowCreate(true);
    // Fetch ICPs and prospects for form
    const [icpRes, prospectRes] = await Promise.all([
      supabase.from("icp_profiles").select("*").eq("is_active", true),
      supabase.from("prospects").select("*").in("status", ["new", "contacted", "interested"]).order("created_at", { ascending: false }).limit(200),
    ]);
    setIcps(icpRes.data ?? []);
    setProspects(prospectRes.data ?? []);
    if (icpRes.data && icpRes.data.length > 0 && !formIcpId) {
      setFormIcpId(icpRes.data[0].id);
    }
  };

  const toggleChannel = (ch: string) => {
    setFormChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const toggleProspect = (id: string) => {
    setFormProspectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formChannels.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          icp_profile_id: formIcpId || null,
          channels: formChannels,
          prospect_ids: formProspectIds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create campaign");
      }
      setShowCreate(false);
      setFormName("");
      setFormChannels(["email"]);
      setFormProspectIds([]);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const formatRate = (num: number, denom: number) =>
    denom === 0 ? "0%" : `${Math.round((num / denom) * 100)}%`;

  const formatStatus = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Orchestrate multi-channel outreach sequences.
          </p>
        </div>
        <Button onClick={openCreateModal}>New Campaign</Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Campaign cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && campaigns.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <div className="py-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-12 w-12 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <p className="mt-3 text-gray-500">No campaigns yet. Create one to get started.</p>
              <Button size="sm" className="mt-4" onClick={openCreateModal}>
                New Campaign
              </Button>
            </div>
          </Card>
        )}

        {!loading &&
          campaigns.map((c) => (
            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={campaignStatusVariant[c.status] ?? "gray"}>
                        {formatStatus(c.status)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {c.channels.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-6">
                  <MetricPill label="Prospects" value={c.total_prospects} />
                  <MetricPill label="Sent" value={c.emails_sent} />
                  <MetricPill label="Open rate" value={formatRate(c.emails_opened, c.emails_sent)} />
                  <MetricPill label="Reply rate" value={formatRate(c.emails_replied, c.emails_sent)} />
                </div>
              </Card>
            </Link>
          ))}
      </div>

      {/* Create Campaign Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Campaign"
        className="max-w-xl"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Campaign Name"
            placeholder="e.g. Q1 SaaS Founders Outreach"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          {/* ICP selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Target ICP
            </label>
            <select
              value={formIcpId}
              onChange={(e) => setFormIcpId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">Select an ICP</option>
              {icps.map((icp) => (
                <option key={icp.id} value={icp.id}>
                  {icp.raw_description.slice(0, 60)}
                  {icp.raw_description.length > 60 ? "..." : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Channel selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Channels
            </label>
            <div className="flex gap-3">
              {["email", "linkedin"].map((ch) => (
                <label
                  key={ch}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    formChannels.includes(ch)
                      ? "border-[#DC2626] bg-red-50 text-[#DC2626]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formChannels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="sr-only"
                  />
                  {ch === "email" ? "Email" : "LinkedIn"}
                </label>
              ))}
            </div>
          </div>

          {/* Prospect selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Select Prospects ({formProspectIds.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {prospects.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">
                  No prospects available. Discover some first.
                </p>
              )}
              {prospects.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={formProspectIds.includes(p.id)}
                    onChange={() => toggleProspect(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#DC2626] focus:ring-red-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {p.company_name ? `${p.company_name} - ` : ""}
                      {p.email}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !formName.trim()}>
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
