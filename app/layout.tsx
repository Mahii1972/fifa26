import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// 8-bit display face — used for headings, labels, accents (kept small; it's wide).
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

// Pixel terminal face — readable at data-density sizes for tables and body text.
const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WC/26 — Teletext Data Service",
  description: "FIFA World Cup 2026 — retro broadcast data terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        pressStart.variable,
        vt323.variable,
      )}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
