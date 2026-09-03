import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlockIntel",
  description: "AI-powered smart contract security analyzer.",
};

// Runs before hydration so the resolved theme (including "system") is set on
// <html> before first paint — otherwise a stored light/system preference would
// flash the default dark palette. Keep the storage key in sync with
// preferences-store.ts's STORAGE_KEY.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("blockintel-preferences");
    var theme = stored ? JSON.parse(stored).theme : "dark";
    var resolved =
      theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : theme;
    document.documentElement.setAttribute("data-theme", resolved);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="h-full flex flex-col overflow-hidden bg-canvas text-ink font-sans"
        suppressHydrationWarning
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
