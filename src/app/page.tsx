import Link from "next/link";
import Nav from "@/components/nav";

const features = [
  {
    title: "Describe Your Business, Launch in Minutes",
    description:
      "Tell ProspectICBM what you sell and who you sell to. Our AI builds your ideal customer profile, generates outreach copy, and launches your first campaign — no spreadsheets, no hours of setup.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.84 2.58m0 0a14.926 14.926 0 01-5.96-5.96M9.63 8.41a6 6 0 017.38-5.84" />
      </svg>
    ),
  },
  {
    title: "AI-Powered Prospect Discovery",
    description:
      "Stop manually searching LinkedIn and buying stale lists. ProspectICBM's AI scours the web to find decision-makers who actually match your ICP — updated in real time, not months ago.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: "Personalized Email Sequences from Your Gmail",
    description:
      "Emails send directly from your Google Workspace account — not a shady third-party server. Each message is AI-personalized so it reads like you wrote it yourself. Better deliverability, better replies.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    title: "LinkedIn Outreach on Autopilot",
    description:
      "Automated connection requests and follow-up messages that feel human. ProspectICBM handles the tedious drip so you can focus on conversations that convert.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: "One Price. Everything Included.",
    description:
      "No per-seat fees, no add-ons, no surprises. Every plan includes prospect discovery, email sequences, LinkedIn automation, and AI personalization. Simple pricing for serious pipelines.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For founders testing outbound",
    features: [
      "100 prospects/month",
      "3-step email sequences",
      "LinkedIn automation",
      "AI personalization",
      "Gmail integration",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$149",
    period: "/mo",
    description: "For teams ready to scale",
    features: [
      "500 prospects/month",
      "5-step email sequences",
      "LinkedIn automation",
      "AI personalization",
      "Gmail integration",
      "Advanced analytics",
    ],
    highlighted: true,
  },
  {
    name: "Scale",
    price: "$299",
    period: "/mo",
    description: "For high-volume outbound machines",
    features: [
      "2,000 prospects/month",
      "Unlimited email steps",
      "LinkedIn automation",
      "AI personalization",
      "Gmail integration",
      "Advanced analytics",
      "Priority support",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Will this get my Gmail account banned?",
    answer:
      "No. ProspectICBM sends emails directly from your Google Workspace account using official Gmail APIs — not SMTP hacks. We enforce sending limits, warm-up schedules, and throttling to stay well within Google's guidelines. Your domain reputation is protected.",
  },
  {
    question: "Is my LinkedIn account safe?",
    answer:
      "Yes. We use human-like delays, randomized actions, and activity limits that mirror normal LinkedIn usage patterns. ProspectICBM never exceeds LinkedIn's daily connection or message thresholds, keeping your account in good standing.",
  },
  {
    question: "How is this different from Apollo, Instantly, or Lemlist?",
    answer:
      "Those tools make you do the work — build lists, write copy, manage sequences. ProspectICBM is an AI-powered SDR: you describe your business and ideal customer, and it handles prospect discovery, email writing, and LinkedIn outreach end-to-end. Less setup, more pipeline.",
  },
  {
    question: "Do I need Google Workspace?",
    answer:
      "Yes, a Google Workspace account is required for email sending. Free Gmail accounts (@gmail.com) are not supported because they lack the API access and sending infrastructure needed for reliable B2B outreach. Google Workspace plans start at $7/month.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* ───────── HERO ───────── */}
      <section className="relative isolate overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[600px] w-[600px] rounded-full bg-[#DC2626]/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-32 h-[500px] w-[500px] rounded-full bg-[#FACC15]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#F97316]/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Stop prospecting.
            <br />
            <span className="text-[#DC2626]">Start closing.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
            ProspectICBM is your AI-powered SDR that finds prospects, sends
            personalized emails from your Gmail, and automates LinkedIn outreach
            — all for less than your monthly coffee budget.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-lg bg-[#DC2626] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#DC2626]/25 hover:bg-[#B91C1C] transition-colors"
            >
              Start free trial
            </Link>
            <a
              href="#features"
              className="rounded-lg border-2 border-[#DC2626] px-8 py-3.5 text-base font-semibold text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to fill your pipeline
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From prospect discovery to booked meetings — one platform, zero busywork.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
                  {f.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section id="pricing" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              No per-seat fees. No hidden add-ons. Pick a plan and start closing.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl bg-white p-8 shadow-sm ring-1 transition-shadow hover:shadow-md ${
                  plan.highlighted
                    ? "ring-2 ring-[#DC2626] scale-[1.02]"
                    : "ring-black/5"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#DC2626] px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-base text-gray-500">{plan.period}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-gray-600">
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-[#DC2626] text-white shadow-lg shadow-[#DC2626]/25 hover:bg-[#B91C1C]"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently asked questions
          </h2>

          <dl className="mt-16 space-y-10">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-base font-semibold text-gray-900">
                  {faq.question}
                </dt>
                <dd className="mt-3 text-sm leading-7 text-gray-600">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-black/5 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-bold text-[#DC2626]">ProspectICBM</span>
          <span className="text-sm text-gray-500">
            &copy; 2026 ProspectICBM. All rights reserved.
          </span>
        </div>
      </footer>
    </>
  );
}
