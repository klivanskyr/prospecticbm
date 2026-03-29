"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Company } from "@/lib/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createClient();

  const fetchCompanies = useCallback(async () => {
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    setCompanies(data || []);
    // Auto-select from URL or first company
    const match = pathname.match(/\/dashboard\/companies\/([^/]+)/);
    if (match) {
      setSelectedCompanyId(match[1]);
    } else if (data && data.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(data[0].id);
    }
  }, [pathname]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // Update selected company when URL changes
  useEffect(() => {
    const match = pathname.match(/\/dashboard\/companies\/([^/]+)/);
    if (match) setSelectedCompanyId(match[1]);
  }, [pathname]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const isNavActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Company Dropdown (Stripe-style) */}
        <div className="border-b border-gray-200 p-3">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 transition"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Company</p>
              <p className="text-sm font-semibold text-[#1C1917] truncate">
                {selectedCompany?.name || "Select company"}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCompanyId(c.id);
                    setDropdownOpen(false);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left transition hover:bg-gray-50 ${c.id === selectedCompanyId ? "bg-red-50 text-[#DC2626] font-medium" : "text-gray-700"}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.id === selectedCompanyId ? "bg-[#DC2626]" : "bg-gray-300"}`} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              <Link
                href="/dashboard/companies/new"
                onClick={() => { setDropdownOpen(false); setSidebarOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#DC2626] font-medium border-t border-gray-100 hover:bg-red-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add company
              </Link>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6">
          {/* Company-scoped nav (only if a company is selected) */}
          {selectedCompanyId && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-medium text-[#78716C] uppercase tracking-wider mb-2">Company</p>

              <Link href={`/dashboard/companies/${selectedCompanyId}`} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isNavActive(`/dashboard/companies/${selectedCompanyId}`, true) ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                Overview
              </Link>

              <Link href={`/dashboard/companies/${selectedCompanyId}?tab=campaigns`} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname.includes(`/companies/${selectedCompanyId}/campaigns`) || (pathname === `/dashboard/companies/${selectedCompanyId}` && typeof window !== "undefined" && window.location.search.includes("tab=campaigns")) ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                Campaigns
              </Link>

              <Link href={`/dashboard/companies/${selectedCompanyId}?tab=prospects`} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname === `/dashboard/companies/${selectedCompanyId}` && typeof window !== "undefined" && window.location.search.includes("tab=prospects") ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                Prospects
              </Link>

              <Link href={`/dashboard/companies/${selectedCompanyId}?tab=icps`} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname === `/dashboard/companies/${selectedCompanyId}` && typeof window !== "undefined" && window.location.search.includes("tab=icps") ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
                ICPs
              </Link>
            </div>
          )}

          {/* Global nav */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-medium text-[#78716C] uppercase tracking-wider mb-2">Global</p>

            <Link href="/dashboard" onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isNavActive("/dashboard", true) ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
              All Companies
            </Link>

            <Link href="/dashboard/prospects" onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isNavActive("/dashboard/prospects") ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              All Prospects
            </Link>

            <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isNavActive("/dashboard/settings") ? "bg-red-50 text-[#DC2626]" : "text-gray-600 hover:bg-gray-50"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200 bg-[#FFFBEB]/80 px-6 backdrop-blur-lg">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Open sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
          </button>
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-[#DC2626]">ProspectICBM</Link>
          <div className="flex-1" />
        </header>

        <main className="flex-1 bg-[#FFFBEB] p-6">{children}</main>
      </div>
    </div>
  );
}
