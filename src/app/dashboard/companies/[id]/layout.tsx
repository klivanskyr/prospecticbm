"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Company } from "@/lib/types";

const TABS = [
  { key: "overview", label: "Overview", href: "" },
  { key: "campaigns", label: "Campaigns", href: "/campaigns" },
  { key: "prospects", label: "Prospects", href: "/prospects" },
  { key: "icps", label: "ICPs", href: "/icps" },
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    const { data } = await supabase.from("companies").select("*").eq("id", id).single();
    setCompany(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  async function handleDelete() {
    if (!confirm("Delete this company and all its data? This cannot be undone.")) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-[#DC2626] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-[#78716C]">Company not found.</p>
        <Link href="/dashboard" className="text-[#DC2626] text-sm mt-2 inline-block hover:underline">Back to companies</Link>
      </div>
    );
  }

  const basePath = `/dashboard/companies/${id}`;

  function isTabActive(tabHref: string) {
    const fullPath = basePath + tabHref;
    if (tabHref === "") {
      // Overview is active only on exact match
      return pathname === basePath;
    }
    return pathname === fullPath || pathname.startsWith(fullPath + "/");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-[#78716C] hover:text-[#DC2626] transition mb-2 inline-block">
            &larr; All Companies
          </Link>
          <h1 className="text-2xl font-bold text-[#1C1917]">{company.name}</h1>
          {company.industry && <p className="text-sm text-[#78716C] mt-1">{company.industry}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`${basePath}/edit`}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-[#DC2626] hover:text-[#DC2626] transition"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border-2 border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs as links */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={basePath + tab.href}
              className={`pb-3 text-sm font-medium transition border-b-2 ${
                isTabActive(tab.href)
                  ? "border-[#DC2626] text-[#DC2626]"
                  : "border-transparent text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}
