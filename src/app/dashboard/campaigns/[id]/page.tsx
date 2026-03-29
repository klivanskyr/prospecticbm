"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge, campaignStatusVariant, prospectStatusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Campaign, CampaignProspect, Prospect } from "@/lib/types";

interface CampaignProspectWithDetails extends CampaignProspect {
  prospects?: Prospect;
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </Card>
  );
}

function SkeletonMetric() {
  return (
    <Card className="animate-pulse text-center">
      <div className="mx-auto h-8 w-12 rounded bg-gray-200" />
      <div className="mx-auto mt-2 h-4 w-20 rounded bg-gray-200" />
    </Card>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignProspects, setCampaignProspects] = useState<CampaignProspectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignRes, prospectsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("id", id).single(),
        supabase
          .from("campaign_prospects")
          .select("*, prospects(*)")
          .eq("campaign_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      if (prospectsRes.error) throw prospectsRes.error;

      setCampaign(campaignRes.data);
      setCampaignProspects(prospectsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: "launch" | "pause" | "resume") => {
    setActionLoading(true);
    try {
      const statusMap = { launch: "active", pause: "paused", resume: "active" } as const;
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ status: statusMap[action] })
        .eq("id", id);
      if (updateError) throw updateError;
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatStatus = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatRate = (num: number, denom: number) =>
    denom === 0 ? "0%" : `${Math.round((num / denom) * 100)}%`;

  const emailStatusVariant: Record<string, "gray" | "blue" | "yellow" | "green" | "red"> = {
    pending: "gray",
    sent: "blue",
    opened: "yellow",
    replied: "green",
    bounced: "red",
  };

  const linkedinStatusVariant: Record<string, "gray" | "blue" | "yellow" | "green" | "red"> = {
    pending: "gray",
    request_sent: "blue",
    connected: "yellow",
    message_sent: "blue",
    replied: "green",
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <p className="text-gray-500">Campaign not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-2 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Campaigns
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={campaignStatusVariant[campaign.status] ?? "gray"}>
              {formatStatus(campaign.status)}
            </Badge>
            <span className="text-sm text-gray-400">
              {campaign.channels.join(", ")}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {campaign.status === "draft" && (
            <Button onClick={() => handleAction("launch")} disabled={actionLoading}>
              {actionLoading ? "Launching..." : "Launch"}
            </Button>
          )}
          {campaign.status === "active" && (
            <Button variant="secondary" onClick={() => handleAction("pause")} disabled={actionLoading}>
              {actionLoading ? "Pausing..." : "Pause"}
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button onClick={() => handleAction("resume")} disabled={actionLoading}>
              {actionLoading ? "Resuming..." : "Resume"}
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total Prospects" value={campaign.total_prospects} />
        <MetricCard label="Emails Sent" value={campaign.emails_sent} />
        <MetricCard
          label="Opened"
          value={campaign.emails_opened}
          sub={formatRate(campaign.emails_opened, campaign.emails_sent)}
        />
        <MetricCard
          label="Replied"
          value={campaign.emails_replied}
          sub={formatRate(campaign.emails_replied, campaign.emails_sent)}
        />
        <MetricCard label="LI Requests" value={campaign.linkedin_requests_sent} />
        <MetricCard
          label="LI Connected"
          value={campaign.linkedin_connections_made}
          sub={formatRate(campaign.linkedin_connections_made, campaign.linkedin_requests_sent)}
        />
      </div>

      {/* Prospects table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Campaign Prospects ({campaignProspects.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email Step</th>
                <th className="px-4 py-3 font-medium text-gray-600">LinkedIn Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">LinkedIn Step</th>
                <th className="px-4 py-3 font-medium text-gray-600">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaignProspects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No prospects in this campaign yet.
                  </td>
                </tr>
              )}
              {campaignProspects.map((cp) => {
                const prospect = cp.prospects as Prospect | undefined;
                const name = prospect
                  ? [prospect.first_name, prospect.last_name].filter(Boolean).join(" ") || prospect.email
                  : "--";
                const maxSteps = 5;
                const emailProgress = Math.min((cp.email_step / maxSteps) * 100, 100);
                const linkedinProgress = Math.min((cp.linkedin_step / maxSteps) * 100, 100);
                const totalProgress = Math.round((emailProgress + linkedinProgress) / 2);

                return (
                  <tr key={cp.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {prospect?.email ?? "--"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emailStatusVariant[cp.email_status] ?? "gray"}>
                        {formatStatus(cp.email_status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cp.email_step}</td>
                    <td className="px-4 py-3">
                      <Badge variant={linkedinStatusVariant[cp.linkedin_status] ?? "gray"}>
                        {formatStatus(cp.linkedin_status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cp.linkedin_step}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-[#DC2626] transition-all"
                            style={{ width: `${totalProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{totalProgress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
