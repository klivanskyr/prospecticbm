"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [icpDescription, setIcpDescription] = useState("");
  const [aiResults, setAiResults] = useState<{
    icp: Record<string, unknown> | null;
    templates: Array<{ subject: string; body: string }>;
  }>({ icp: null, templates: [] });
  const router = useRouter();

  async function handleGenerateICP() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyDescription, icpDescription }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate ICP");
      }
      const data = await res.json();
      setAiResults({ icp: data.icp, templates: data.templates });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full ${
                s <= step ? "bg-[#DC2626]" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Company Description */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-[#1C1917] mb-2">
              Tell us about your company
            </h1>
            <p className="text-[#78716C] mb-6">
              Describe what your company does, your products/services, and your
              value proposition.
            </p>
            <textarea
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-40 focus:outline-none focus:ring-2 focus:ring-[#DC2626] resize-none"
              placeholder="e.g., We're a B2B SaaS company that helps sales teams automate outbound prospecting..."
              required
            />
            <button
              onClick={() => setStep(2)}
              disabled={!companyDescription.trim()}
              className="mt-6 w-full bg-[#DC2626] text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: ICP Description */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold text-[#1C1917] mb-2">
              Describe your ideal customer
            </h1>
            <p className="text-[#78716C] mb-6">
              Who are your best customers? Include details like industry, company
              size, job titles, pain points, and budget.
            </p>
            <textarea
              value={icpDescription}
              onChange={(e) => setIcpDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-40 focus:outline-none focus:ring-2 focus:ring-[#DC2626] resize-none"
              placeholder="e.g., VP of Sales or Head of Revenue at B2B SaaS companies with 50-500 employees..."
              required
            />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-[#1C1917] py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleGenerateICP}
                disabled={!icpDescription.trim() || loading}
                className="flex-1 bg-[#DC2626] text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? "Analyzing with AI..." : "Generate ICP & Templates"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review AI Results */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold text-[#1C1917] mb-2">
              Your AI-generated profile
            </h1>
            <p className="text-[#78716C] mb-6">
              Review the ICP and email templates we created for you.
            </p>

            {aiResults.icp && (
              <div className="bg-[#FFFBEB] border border-[#FACC15] rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-[#1C1917] mb-2">
                  Ideal Customer Profile
                </h3>
                <pre className="text-sm text-[#78716C] whitespace-pre-wrap">
                  {JSON.stringify(aiResults.icp, null, 2)}
                </pre>
              </div>
            )}

            {aiResults.templates.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-[#1C1917]">
                  Email Templates
                </h3>
                {aiResults.templates.map((t, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <p className="font-medium text-[#1C1917] mb-1">
                      {t.subject}
                    </p>
                    <p className="text-sm text-[#78716C] whitespace-pre-wrap">
                      {t.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 text-[#1C1917] py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 bg-[#DC2626] text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
