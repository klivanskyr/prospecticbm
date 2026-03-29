"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", website_url: "", description: "", value_proposition: "",
    industry: "", target_market: "", company_size: "", differentiators: "",
  });

  useEffect(() => {
    fetch(`/api/companies/${id}`).then((r) => r.json()).then((data) => {
      setForm({
        name: data.name || "",
        website_url: data.website_url || "",
        description: data.description || "",
        value_proposition: data.value_proposition || "",
        industry: data.industry || "",
        target_market: data.target_market || "",
        company_size: data.company_size || "",
        differentiators: data.differentiators || "",
      });
      setLoading(false);
    });
  }, [id]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.push(`/dashboard/companies/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin h-8 w-8 border-4 border-[#DC2626] border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-lg mx-auto">
      <Link href={`/dashboard/companies/${id}`} className="text-sm text-[#78716C] hover:text-[#DC2626] transition mb-4 inline-block">&larr; Back to company</Link>
      <h1 className="text-2xl font-bold text-[#1C1917] mb-6">Edit Company</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Company Name *</label><input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Website</label><input type="url" value={form.website_url} onChange={(e) => update("website_url", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Description *</label><textarea value={form.description} onChange={(e) => update("description", e.target.value)} required rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Value Proposition</label><input type="text" value={form.value_proposition} onChange={(e) => update("value_proposition", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Industry</label><input type="text" value={form.industry} onChange={(e) => update("industry", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
          <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Company Size</label><input type="text" value={form.company_size} onChange={(e) => update("company_size", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        </div>
        <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Target Market</label><input type="text" value={form.target_market} onChange={(e) => update("target_market", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        <div><label className="block text-sm font-medium text-[#1C1917] mb-1">Differentiators</label><textarea value={form.differentiators} onChange={(e) => update("differentiators", e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DC2626]" /></div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="w-full bg-[#DC2626] text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
      </form>
    </div>
  );
}
