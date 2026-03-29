"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Company Info", "Description", "Details", "Target Audience"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    website_url: "",
    description: "",
    value_proposition: "",
    industry: "",
    target_market: "",
    company_size: "",
    differentiators: "",
    icp_description: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create company");
      }
      const company = await res.json();

      if (form.icp_description.trim()) {
        await fetch(`/api/companies/${company.id}/icps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_description: form.icp_description }),
        });
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const canNext =
    step === 0 ? form.name.trim() !== "" :
    step === 1 ? form.description.trim() !== "" :
    true;

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-[#1C1917] mb-1">Set up your company</h1>
        <p className="text-[#78716C] mb-6 text-sm">Step {step + 1} of {STEPS.length}</p>

        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#DC2626]" : "bg-gray-200"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Company Name *</label>
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="Acme Inc." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Website URL</label>
              <input type="url" value={form.website_url} onChange={(e) => update("website_url", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="https://acme.com" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">What does your company do? *</label>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="We build software that helps small businesses manage their inventory..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Value Proposition</label>
              <textarea value={form.value_proposition} onChange={(e) => update("value_proposition", e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="Save 10 hours/week on inventory management..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Industry</label>
              <input type="text" value={form.industry} onChange={(e) => update("industry", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="SaaS, E-commerce, Healthcare..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Target Market</label>
              <input type="text" value={form.target_market} onChange={(e) => update("target_market", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="Small businesses in the US..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Company Size</label>
              <input type="text" value={form.company_size} onChange={(e) => update("company_size", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="1-10 employees, bootstrapped..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Key Differentiators</label>
              <textarea value={form.differentiators} onChange={(e) => update("differentiators", e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="What makes you different from competitors?" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Describe your ideal customer <span className="text-[#78716C] font-normal">(optional)</span>
              </label>
              <p className="text-xs text-[#78716C] mb-2">Our AI will parse this into targeting criteria. You can add this later too.</p>
              <textarea value={form.icp_description} onChange={(e) => update("icp_description", e.target.value)} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="SaaS founders with 10-50 employees, Series A funded, based in the US..." />
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <div className="flex justify-between mt-8">
          <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="px-6 py-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition disabled:opacity-0">
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="px-6 py-2.5 bg-[#DC2626] text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !form.name.trim() || !form.description.trim()} className="px-6 py-2.5 bg-[#DC2626] text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50">
              {loading ? "Creating..." : "Create Company"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
