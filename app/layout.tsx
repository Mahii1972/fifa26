import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  title: "HEM's FIFA Calendar — WC/26",
  description: "HEM's FIFA Calendar — FIFA World Cup 2026 retro broadcast data terminal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04030a",
  colorScheme: "dark",
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
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
