import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { LocaleProvider } from "@/lib/i18n/context";
import { getLocale } from "@/lib/i18n/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mnemo",
  description: "AI-maintained personal knowledge base",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`dark ${inter.variable}`}>
      <body className="flex min-h-screen bg-wiki-bg text-wiki-text font-sans">
        <LocaleProvider initialLocale={locale}>
          <Sidebar />
          <main className="flex-1 min-w-0 pt-[5.5rem] md:pt-0">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
