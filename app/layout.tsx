import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { LocaleProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/context";
import { getLocale } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mnemo",
  description: "AI-maintained personal knowledge base",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = await getTheme();
  const themeClass = theme !== "light" ? `theme-${theme}` : "";

  return (
    <html lang={locale} className={`${inter.variable} ${themeClass}`.trim()}>
      <body className="flex min-h-screen bg-wiki-bg text-wiki-text font-sans">
        <ThemeProvider initialTheme={theme}>
          <LocaleProvider initialLocale={locale}>
            <Sidebar />
            <main className="flex-1 min-w-0 pt-[5.5rem] md:pt-0">{children}</main>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
