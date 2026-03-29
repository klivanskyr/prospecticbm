"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge, campaignStatusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Campaign, CampaignProspect, Prospect } from "@/lib/types";

interface CampaignProspectWithDetails extends CampaignProspect {
  prospects?: Prospect;
}

interface OutreachEvent {
  id: string;
  channel: string;
  event_type: string;
  sequence_step: number;
  metadata: Record<string, unknown>;
  created_at: string;
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

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignProspects, setCampaignProspects] = useState<CampaignProspectWithDetails[]>([]);
  const [activityFeed, setActivityFeed] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignRes, prospectsRes, eventsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("id", id).single(),
        supabase.from("campaign_prospects").select("*, prospects(*)").eq("campaign_id", id).order("created_at", { ascending: false }),
        supabase.from("outreach_events").select("*").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").order("created_at", { ascending: false }).limit(20),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      setCampaign(campaignRes.data);
      setCampaignProspects(prospectsRes.data ?? []);
      setActivityFeed(eventsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Supabase Realtime Subscriptions ───
  useEffect(() => {
    // Subscribe to campaign updates (counter changes)
    const campaignChannel = supabase
      .channel(`campaign-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "campaigns",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setCampaign((prev) => prev ? { ...prev, ...payload.new } as Campaign : null);
      })
      .subscribe();

    // Subscribe to new campaign_prospects (new discoveries)
    const prospectsChannel = supabase
      .channel(`campaign-prospects-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "campaign_prospects",
        filter: `campaign_id=eq.${id}`,
      }, async () => {
        // Refetch prospects to get joined data
        const { data } = await supabase
          .from("campaign_prospects")
          .select("*, prospects(*)")
          .eq("campaign_id", id)
          .order("created_at", { ascending: false });
        if (data) setCampaignProspects(data);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "campaign_prospects",
        filter: `campaign_id=eq.${id}`,
      }, async () => {
        const { data } = await supabase
          .from("campaign_prospects")
          .select("*, prospects(*)")
          .eq("campaign_id", id)
          .order("created_at", { ascending: false });
        if (data) setCampaignProspects(data);
      })
      .subscribe();

    // Subscribe to outreach events (activity feed)
    const eventsChannel = supabase
      .channel(`outreach-events-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "outreach_events",
      }, (payload) => {
        setActivityFeed((prev) => [payload.new as OutreachEvent, ...prev].slice(0, 30));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(campaignChannel);
      supabase.removeChannel(prospectsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [id, supabase]);

  const handleAction = async (action: "launch" | "pause" | "resume") => {
    setActionLoading(true);
    try {
      const statusMap = { launch: "active", pause: "paused", resume: "active" } as const;
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ status: statusMap[action], ...(action === "launch" ? { started_at: new Date().toISOString() } : {}) })
        .eq("id", id);
      if (updateError) throw updateError;

      // If launching or resuming, trigger the Inngest pipeline
      if (action === "launch" || action === "resume") {
        await fetch(`/api/campaigns/${id}/launch`, { method: "POST" });
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const formatRate = (num: number, denom: number) => denom === 0 ? "0%" : `${Math.round((num / denom) * 100)}%`;
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const emailStatusVariant: Record<string, "gray" | "blue" | "yellow" | "green" | "red"> = {
    pending: "gray", sent: "blue", opened: "yellow", replied: "green", bounced: "red",
  };
  const linkedinStatusVariant: Record<string, "gray" | "blue" | "yellow" | "green" | "red"> = {
    pending: "gray", request_sent: "blue", connected: "yellow", message_sent: "blue", replied: "green",
  };

  const eventIcon = (type: string) => {
    switch (type) {
      case "sent": return "📧";
      case "opened": return "👀";
      case "replied": return "💬";
      case "bounced": return "❌";
      case "connected": return "🤝";
      default: return "📋";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse text-center">
              <div className="mx-auto h-8 w-12 rounded bg-gray-200" />
              <div className="mx-auto mt-2 h-4 w-20 rounded bg-gray-200" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <p className="text-gray-500">Campaign not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard")}>Back</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => router.push("/dashboard")} className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={campaignStatusVariant[campaign.status] ?? "gray"}>{formatStatus(campaign.status)}</Badge>
            <span className="text-sm text-gray-400">{campaign.channels.join(", ")}</span>
          </div>
        </div>
        <div className="flex gap-3">
          {campaign.status === "draft" && (
            <Button onClick={() => handleAction("launch")} disabled={actionLoading}>
              {actionLoading ? "Launching..." : "Launch Campaign"}
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Pipeline Status Banner */}
      {campaign.status === "active" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-3 w-3">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75" />
              <div className="relative h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Pipeline Active — Discovering & sending automatically</p>
              <p className="text-xs text-green-600 mt-0.5">
                {campaign.daily_emails_sent} / {campaign.max_daily_emails} emails sent today
                {campaign.daily_linkedin_sent > 0 && ` · ${campaign.daily_linkedin_sent} / ${campaign.max_daily_linkedin} LinkedIn today`}
              </p>
            </div>
          </div>
          {/* Daily quota progress bar */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-green-700 w-16">Daily</span>
            <div className="flex-1 h-2 bg-green-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min((campaign.daily_emails_sent / Math.max(campaign.max_daily_emails, 1)) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-green-700 w-24 text-right">
              {campaign.max_daily_emails - campaign.daily_emails_sent} remaining
            </span>
          </div>
        </div>
      )}

      {campaign.status === "paused" && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <p className="text-sm font-medium text-yellow-800">Pipeline paused. Click Resume to continue discovering prospects.</p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Prospects Found" value={campaign.total_prospects} />
        <MetricCard label="Emails Sent" value={campaign.emails_sent} />
        <MetricCard label="Opened" value={campaign.emails_opened} sub={formatRate(campaign.emails_opened, campaign.emails_sent)} />
        <MetricCard label="Replied" value={campaign.emails_replied} sub={formatRate(campaign.emails_replied, campaign.emails_sent)} />
        <MetricCard label="LI Requests" value={campaign.linkedin_requests_sent} />
        <MetricCard label="LI Connected" value={campaign.linkedin_connections_made} sub={formatRate(campaign.linkedin_connections_made, campaign.linkedin_requests_sent)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Live Activity</h3>
              {campaign.status === "active" && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {activityFeed.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  {campaign.status === "active" ? "Waiting for first discovery..." : "No activity yet. Launch the campaign to start."}
                </div>
              )}
              {activityFeed.map((event) => (
                <div key={event.id} className="px-4 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{eventIcon(event.event_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{formatStatus(event.event_type)}</span>
                        <span className="text-gray-500"> · {event.channel} step {event.sequence_step}</span>
                      </p>
                      {"to" in (event.metadata || {}) && (
                        <p className="text-xs text-gray-500 truncate">{String((event.metadata as Record<string, unknown>).to)}</p>
                      )}
                      {"subject" in (event.metadata || {}) && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{String((event.metadata as Record<string, unknown>).subject)}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Prospects Table */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Prospects ({campaignProspects.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Step</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaignProspects.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        {campaign.status === "active" ? "Discovering prospects..." : "No prospects yet."}
                      </td>
                    </tr>
                  )}
                  {campaignProspects.map((cp) => {
                    const prospect = cp.prospects as Prospect | undefined;
                    const name = prospect ? [prospect.first_name, prospect.last_name].filter(Boolean).join(" ") || prospect.email : "--";
                    const maxSteps = 3;
                    const progress = Math.round((cp.email_step / maxSteps) * 100);

                    return (
                      <tr key={cp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{prospect?.email ?? "--"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={emailStatusVariant[cp.email_status] ?? "gray"}>
                            {formatStatus(cp.email_status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{cp.email_step}/{maxSteps}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                              <div className="h-full rounded-full bg-[#DC2626] transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{progress}%</span>
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
      </div>
    </div>
  );
}
