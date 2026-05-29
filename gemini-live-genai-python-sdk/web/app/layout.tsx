import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemini Live · Memory Demo",
  description:
    "A real-time Gemini Live voice/video demo that builds a persistent, structured memory of the people it sees and talks to.",
};

// Mobile-first: lock the layout to the device width and tint the browser chrome
// to match the dark agent stage.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
