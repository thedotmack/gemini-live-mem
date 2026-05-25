import type { Metadata } from "next";
// next/font/google self-hosts the fonts (no runtime request to Google).
// Fraunces = headings (serif), Space Grotesk = body, JetBrains Mono = mono.
import { Fraunces, Space_Grotesk, JetBrains_Mono } from "next/font/google";
// CopilotKit base styles MUST be imported once at the root, before globals.css
// so our --copilot-kit-* overrides in globals.css win the cascade.
import "@copilotkit/react-ui/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Browser Pilot — Interactive Browser Agent",
  description:
    "Chat with an AI agent that drives a real browser in real time. Built on CopilotKit + AG-UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme="dark" activates CopilotKit's dark-mode --copilot-kit-* selector.
    <html lang="en" data-theme="dark">
      <body
        className={`${fraunces.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
