"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCompanyPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", website_url: "", description: "", value_proposition: "",
    industry: "", target_market: "", company_size: "", differentiators: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      router.push(`/dashboard/companies/${company.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/dashboard" className="text-sm text-[#78716C] hover:text-[#DC2626] transition mb-4 inline-block">&larr; Back to companies</Link>
      <h1 className="text-2xl font-bold text-[#1C1917] mb-6">Add a new company</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1">Company Name *</label>
          <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1">Website</label>
          <input type="url" value={form.website_url} onChange={(e) => update("website_url", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1">Description *</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} required rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1">Value Proposition</label>
          <input type="text" value={form.value_proposition} onChange={(e) => update("value_proposition", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">Industry</label>
            <input type="text" value={form.industry} onChange={(e) => update("industry", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">Company Size</label>
            <input type="text" value={form.company_size} onChange={(e) => update("company_size", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1">Target Market</label>
          <input type="text" value={form.target_market} onChange={(e) => update("target_market", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1">Differentiators</label>
          <textarea value={form.differentiators} onChange={(e) => update("differentiators", e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading || !form.name.trim() || !form.description.trim()} className="w-full bg-[#DC2626] text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
          {loading ? "Creating..." : "Create Company"}
        </button>
      </form>
    </div>
  );
}
