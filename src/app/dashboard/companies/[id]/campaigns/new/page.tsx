"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { IcpProfile, Template, Prospect } from "@/lib/types";

type Channel = "email" | "linkedin";
type DiscoverOption = "auto" | "existing" | "both";

const STEPS = [
  "Target ICP",
  "Channels",
  "Templates",
  "Prospects",
  "Review & Launch",
] as const;

export default function NewCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: ICP
  const [icps, setIcps] = useState<IcpProfile[]>([]);
  const [selectedIcpId, setSelectedIcpId] = useState<string | null>(null);
  const [creatingIcp, setCreatingIcp] = useState(false);
  const [newIcpDescription, setNewIcpDescription] = useState("");
  const [icpLoading, setIcpLoading] = useState(true);

  // Step 2: Channels
  const [channels, setChannels] = useState<Channel[]>([]);

  // Step 3: Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Step 4: Prospects
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([]);
  const [discoverOption, setDiscoverOption] = useState<DiscoverOption>("existing");
  const [discoverCount, setDiscoverCount] = useState(10);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);
  const [prospectsLoading, setProspectsLoading] = useState(false);

  // Step 5: Review
  const [campaignName, setCampaignName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- Data fetching ---

  const fetchIcps = useCallback(async () => {
    setIcpLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/icps`);
      if (!res.ok) throw new Error("Failed to load ICPs");
      const data = await res.json();
      setIcps(data.icps ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ICPs");
    } finally {
      setIcpLoading(false);
    }
  }, [companyId]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("templates")
        .select("*")
        .eq("company_id", companyId)
        .in("channel", channels)
        .order("channel")
        .order("sequence_step", { ascending: true });
      if (err) throw err;
      setTemplates(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, [companyId, channels]);

  const fetchProspects = useCallback(async () => {
    setProspectsLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("prospects")
        .select("*")
        .eq("company_id", companyId)
        .in("status", ["new", "contacted", "interested"])
        .order("created_at", { ascending: false });
      if (err) throw err;
      setProspects(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prospects");
    } finally {
      setProspectsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchIcps();
  }, [fetchIcps]);

  useEffect(() => {
    if (step === 2 && channels.length > 0) fetchTemplates();
  }, [step, channels, fetchTemplates]);

  useEffect(() => {
    if (step === 3) fetchProspects();
  }, [step, fetchProspects]);

  // --- Handlers ---

  const handleCreateIcp = async () => {
    if (!newIcpDescription.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/icps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_description: newIcpDescription }),
      });
      let created;
      try {
        created = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}). Please try again.`);
      }
      if (!res.ok) {
        throw new Error(created.error ?? "Failed to create ICP");
      }
      const newIcp = created.icp ?? created;
      setIcps((prev) => [newIcp, ...prev]);
      setSelectedIcpId(newIcp.id);
      setCreatingIcp(false);
      setNewIcpDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ICP");
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleProspect = (id: string) => {
    setSelectedProspectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAllProspects = () => {
    if (selectedProspectIds.length === prospects.length) {
      setSelectedProspectIds([]);
    } else {
      setSelectedProspectIds(prospects.map((p) => p.id));
    }
  };

  const handleDiscover = async () => {
    if (!selectedIcpId) return;
    setLoading(true);
    setError(null);
    setDiscoverMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/prospects/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp_profile_id: selectedIcpId,
          count: discoverCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      setDiscoverMessage(
        `Discovery started! Finding up to ${data.maxProspects} prospects. ${data.prospects_remaining} remain in your quota.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (status: "draft" | "active") => {
    if (!campaignName.trim()) {
      setError("Campaign name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          icp_profile_id: selectedIcpId,
          channels,
          template_ids: selectedTemplateIds,
          prospect_ids: selectedProspectIds,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      router.push(`/dashboard/companies/${companyId}/campaigns`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Validation ---

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return !!selectedIcpId;
      case 1:
        return channels.length > 0;
      case 2:
        return selectedTemplateIds.length > 0;
      case 3:
        return (
          selectedProspectIds.length > 0 ||
          discoverOption === "auto" ||
          discoverOption === "both"
        );
      case 4:
        return !!campaignName.trim();
      default:
        return false;
    }
  };

  // --- Filtered templates ---

  const emailTemplates = templates.filter((t) => t.channel === "email");
  const linkedinTemplates = templates.filter((t) => t.channel === "linkedin");

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Back link */}
      <button
        onClick={() => router.push(`/dashboard/companies/${companyId}`)}
        className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to Company
      </button>

      <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
                i === step
                  ? "bg-[#DC2626] text-white"
                  : i < step
                    ? "bg-red-100 text-[#DC2626] hover:bg-red-200"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                {i < step ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="h-3 w-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-4 ${
                  i < step ? "bg-[#DC2626]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ───── Step 0: Target ICP ───── */}
      {step === 0 && (
        <Card title="Select Target ICP">
          {icpLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {icps.map((icp) => (
                <button
                  key={icp.id}
                  onClick={() => setSelectedIcpId(icp.id)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                    selectedIcpId === icp.id
                      ? "border-[#DC2626] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {icp.raw_description.length > 120
                      ? icp.raw_description.slice(0, 120) + "..."
                      : icp.raw_description}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {icp.target_industries?.slice(0, 3).map((ind) => (
                      <span
                        key={ind}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {ind}
                      </span>
                    ))}
                    {icp.target_job_titles?.slice(0, 3).map((title) => (
                      <span
                        key={title}
                        className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </button>
              ))}

              {icps.length === 0 && !creatingIcp && (
                <p className="py-4 text-center text-sm text-gray-400">
                  No ICPs found for this company. Create one below.
                </p>
              )}

              {!creatingIcp ? (
                <button
                  onClick={() => setCreatingIcp(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500 transition-colors hover:border-[#DC2626] hover:text-[#DC2626]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Create New ICP
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border-2 border-[#DC2626] bg-red-50/50 p-4">
                  <label className="text-sm font-medium text-gray-700">
                    Describe your Ideal Customer Profile
                  </label>
                  <textarea
                    value={newIcpDescription}
                    onChange={(e) => setNewIcpDescription(e.target.value)}
                    placeholder="e.g., SaaS CTOs at Series A-C startups in fintech, 50-200 employees, US-based..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateIcp}
                      disabled={loading || !newIcpDescription.trim()}
                    >
                      {loading ? "Creating..." : "Create ICP"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCreatingIcp(false);
                        setNewIcpDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ───── Step 1: Channels ───── */}
      {step === 1 && (
        <Card title="Select Outreach Channels">
          <p className="mb-4 text-sm text-gray-500">
            Choose at least one channel for your campaign.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["email", "linkedin"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => toggleChannel(ch)}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  channels.includes(ch)
                    ? "border-[#DC2626] bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    channels.includes(ch)
                      ? "bg-[#DC2626] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {ch === "email" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{ch}</p>
                  <p className="text-xs text-gray-500">
                    {ch === "email"
                      ? "Automated email sequences"
                      : "LinkedIn connection & messaging"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ───── Step 2: Templates ───── */}
      {step === 2 && (
        <Card title="Select Templates">
          {templatesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {channels.includes("email") && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    Email Templates
                  </h4>
                  {emailTemplates.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
                      No email templates found for this company. Create
                      templates first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {emailTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => toggleTemplate(t.id)}
                          className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                            selectedTemplateIds.includes(t.id)
                              ? "border-[#DC2626] bg-red-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400">
                              Step {t.sequence_step}
                            </span>
                            {selectedTemplateIds.includes(t.id) && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className="h-4 w-4 text-[#DC2626]"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            )}
                          </div>
                          {t.subject && (
                            <p className="text-sm font-medium text-gray-900">
                              {t.subject}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                            {t.body}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {channels.includes("linkedin") && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    LinkedIn Templates
                  </h4>
                  {linkedinTemplates.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
                      No LinkedIn templates found for this company. Create
                      templates first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {linkedinTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => toggleTemplate(t.id)}
                          className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                            selectedTemplateIds.includes(t.id)
                              ? "border-[#DC2626] bg-red-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400">
                              Step {t.sequence_step}
                            </span>
                            {selectedTemplateIds.includes(t.id) && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className="h-4 w-4 text-[#DC2626]"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                            {t.body}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ───── Step 3: Prospects ───── */}
      {step === 3 && (
        <Card title="Add Prospects">
          <div className="space-y-4">
            {/* Discovery option tabs */}
            <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
              {(
                [
                  ["existing", "Select Existing"],
                  ["auto", "Auto-Discover"],
                  ["both", "Both"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDiscoverOption(val)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    discoverOption === val
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Auto-discover section */}
            {(discoverOption === "auto" || discoverOption === "both") && (
              <div className="rounded-lg border border-yellow-200 bg-[#FFFBEB] p-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Auto-Discover Prospects
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Find new prospects matching your selected ICP automatically.
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="How many prospects?"
                      type="number"
                      min={1}
                      max={100}
                      value={discoverCount}
                      onChange={(e) =>
                        setDiscoverCount(parseInt(e.target.value) || 10)
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleDiscover}
                    disabled={loading || !selectedIcpId}
                  >
                    {loading ? "Discovering..." : "Discover"}
                  </Button>
                </div>
                {discoverMessage && (
                  <p className="mt-2 text-xs font-medium text-green-700">
                    {discoverMessage}
                  </p>
                )}
              </div>
            )}

            {/* Existing prospects */}
            {(discoverOption === "existing" || discoverOption === "both") && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Existing Prospects ({prospects.length})
                  </h4>
                  {prospects.length > 0 && (
                    <button
                      onClick={toggleAllProspects}
                      className="text-xs font-medium text-[#DC2626] hover:text-red-700"
                    >
                      {selectedProspectIds.length === prospects.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>
                {prospectsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded-lg bg-gray-100"
                      />
                    ))}
                  </div>
                ) : prospects.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
                    No prospects found. Use auto-discover to find new ones.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200">
                    {prospects.map((p) => (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-50 ${
                          selectedProspectIds.includes(p.id) ? "bg-red-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProspectIds.includes(p.id)}
                          onChange={() => toggleProspect(p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#DC2626] focus:ring-red-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {[p.first_name, p.last_name]
                              .filter(Boolean)
                              .join(" ") || p.email}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {p.job_title
                              ? `${p.job_title} at ${p.company_name ?? "Unknown"}`
                              : p.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {selectedProspectIds.length > 0 && (
                  <p className="mt-2 text-xs font-medium text-[#DC2626]">
                    {selectedProspectIds.length} prospect
                    {selectedProspectIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ───── Step 4: Review & Launch ───── */}
      {step === 4 && (
        <Card title="Review & Launch">
          <div className="space-y-5">
            <Input
              label="Campaign Name"
              placeholder="e.g., Q1 Fintech CTO Outreach"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />

            <div className="space-y-3 rounded-lg bg-[#FFFBEB] p-4">
              <h4 className="text-sm font-semibold text-gray-900">Summary</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ICP</span>
                  <span className="font-medium text-gray-900">
                    {icps.find((i) => i.id === selectedIcpId)
                      ?.raw_description.slice(0, 50) ?? "None"}
                    ...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Channels</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {channels.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Templates</span>
                  <span className="font-medium text-gray-900">
                    {selectedTemplateIds.length} template
                    {selectedTemplateIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prospects</span>
                  <span className="font-medium text-gray-900">
                    {selectedProspectIds.length} prospect
                    {selectedProspectIds.length !== 1 ? "s" : ""}
                    {discoverOption !== "existing" && " + auto-discovered"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSubmit("draft")}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSubmit("active")}
                disabled={submitting}
              >
                {submitting ? "Launching..." : "Launch Campaign"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          Previous
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
