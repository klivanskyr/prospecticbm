"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Company } from "@/lib/types";

export default function CompanyOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);

  const fetch_ = useCallback(async () => {
    const { data } = await supabase.from("companies").select("*").eq("id", id).single();
    setCompany(data);
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (!company) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-[#78716C]">Description</p>
          <p className="text-sm text-[#1C1917] mt-1">{company.description}</p>
        </div>
        {company.value_proposition && (
          <div>
            <p className="text-xs font-medium text-[#78716C]">Value Proposition</p>
            <p className="text-sm text-[#1C1917] mt-1">{company.value_proposition}</p>
          </div>
        )}
        {company.target_market && (
          <div>
            <p className="text-xs font-medium text-[#78716C]">Target Market</p>
            <p className="text-sm text-[#1C1917] mt-1">{company.target_market}</p>
          </div>
        )}
        {company.company_size && (
          <div>
            <p className="text-xs font-medium text-[#78716C]">Company Size</p>
            <p className="text-sm text-[#1C1917] mt-1">{company.company_size}</p>
          </div>
        )}
        {company.differentiators && (
          <div>
            <p className="text-xs font-medium text-[#78716C]">Differentiators</p>
            <p className="text-sm text-[#1C1917] mt-1">{company.differentiators}</p>
          </div>
        )}
        {company.website_url && (
          <div>
            <p className="text-xs font-medium text-[#78716C]">Website</p>
            <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#DC2626] hover:underline mt-1 inline-block">
              {company.website_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
