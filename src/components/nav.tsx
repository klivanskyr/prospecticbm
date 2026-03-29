"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-[#FFFBEB]/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight text-[#DC2626]">
          ProspectICBM
        </Link>

        {/* Center links — desktop */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-gray-700 hover:text-[#DC2626] transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-gray-700 hover:text-[#DC2626] transition-colors">
            Pricing
          </a>
          <a href="#faq" className="text-sm font-medium text-gray-700 hover:text-[#DC2626] transition-colors">
            FAQ
          </a>
        </div>

        {/* Right side — desktop */}
        <div className="hidden items-center gap-4 md:flex">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#DC2626] transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] transition-colors"
              >
                Start free trial
              </Link>
            </>
          )}
        </div>

        {/* Hamburger — mobile */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-black/5 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-black/5 px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700 hover:text-[#DC2626]">
              Features
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700 hover:text-[#DC2626]">
              Pricing
            </a>
            <a href="#faq" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700 hover:text-[#DC2626]">
              FAQ
            </a>
            <hr className="border-black/10" />
            {isLoggedIn ? (
              <Link href="/dashboard" className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C]">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-[#DC2626]">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C]"
                >
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
