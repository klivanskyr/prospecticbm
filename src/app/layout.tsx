import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ProspectICBM — AI-Powered Outreach",
  description:
    "ProspectICBM is your AI-powered SDR that finds prospects, sends personalized emails from your Gmail, and automates LinkedIn outreach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} antialiased`}>
      <body className="min-h-screen bg-[#FFFBEB]">{children}</body>
    </html>
  );
}
