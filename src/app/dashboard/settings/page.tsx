"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";

function SectionSkeleton() {
  return (
    <Card className="animate-pulse space-y-4">
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="h-10 w-full rounded bg-gray-200" />
    </Card>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const supabase = createClient();

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (fetchError) throw fetchError;

      setUser(data);
      setFullName(data.full_name ?? "");
      setCompanyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ full_name: fullName.trim() })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    window.location.href = "/api/gmail/auth";
  };

  const handleBillingPortal = async () => {
    try {
      const res = await fetch("/api/webhooks/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error("Failed to open billing portal");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    }
  };

  const planColors: Record<string, string> = {
    starter: "text-gray-700",
    growth: "text-[#DC2626]",
    scale: "text-[#DC2626]",
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile */}
      <Card title="Profile">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saveSuccess && (
              <span className="text-sm font-medium text-green-600">Saved!</span>
            )}
          </div>
        </form>
      </Card>

      {/* Gmail */}
      <Card title="Gmail Integration">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Connect your Gmail to send outreach emails directly from your account.
            </p>
            <div className="mt-2">
              {user?.gmail_connected ? (
                <Badge variant="green">Connected</Badge>
              ) : (
                <Badge variant="gray">Disconnected</Badge>
              )}
            </div>
          </div>
          <Button
            variant={user?.gmail_connected ? "outline" : "primary"}
            size="sm"
            onClick={handleConnectGmail}
          >
            {user?.gmail_connected ? "Reconnect" : "Connect Gmail"}
          </Button>
        </div>
        {user?.gmail_connected && (
          <p className="mt-3 text-xs text-gray-400">
            Daily email limit: {user.daily_email_limit} emails/day
          </p>
        )}
      </Card>

      {/* LinkedIn */}
      <Card title="LinkedIn Extension">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Install the browser extension to automate LinkedIn connection requests and messages.
            </p>
            <div className="mt-2">
              {user?.linkedin_connected ? (
                <Badge variant="green">Connected</Badge>
              ) : (
                <Badge variant="gray">Disconnected</Badge>
              )}
            </div>
          </div>
          {!user?.linkedin_connected && (
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          )}
        </div>
      </Card>

      {/* Billing */}
      <Card title="Billing">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className={`text-lg font-bold capitalize ${planColors[user?.plan ?? "starter"]}`}>
                {user?.plan ?? "Starter"}
              </p>
            </div>
            <Badge variant={user?.subscription_status === "active" || user?.subscription_status === "trialing" ? "green" : "yellow"}>
              {user?.subscription_status === "trialing"
                ? "Trial"
                : user?.subscription_status === "active"
                ? "Active"
                : user?.subscription_status === "past_due"
                ? "Past Due"
                : "Canceled"}
            </Badge>
          </div>

          {/* Usage bar */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Prospects used this cycle</span>
              <span className="font-medium text-gray-900">
                {user?.prospects_used_this_cycle ?? 0} / {user?.monthly_prospect_limit ?? 0}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-[#DC2626] transition-all"
                style={{
                  width: `${Math.min(
                    ((user?.prospects_used_this_cycle ?? 0) / (user?.monthly_prospect_limit || 1)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={handleBillingPortal}>
              Manage Billing
            </Button>
            {user?.plan !== "scale" && (
              <Button variant="outline" size="sm" onClick={handleBillingPortal}>
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
