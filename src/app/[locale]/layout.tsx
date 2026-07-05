import type { Metadata } from "next";
import { Inter, Noto_Sans_Armenian } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Inter covers Latin + Cyrillic (brand body font, 09_Brand_Guidelines.md).
// It has no Armenian glyphs, so Noto Sans Armenian is paired in as a
// fallback: browsers render each glyph from whichever font supports it, so
// Armenian text stays legible instead of falling back to a generic system
// font or missing-glyph boxes.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansArmenian = Noto_Sans_Armenian({
  subsets: ["armenian"],
  variable: "--font-noto-armenian",
  display: "swap",
});

export const metadata: Metadata = {
  title: "On-Time",
  description: "Booking and growth platform for independent specialists in Armenia.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Common" });

  return (
    <html lang={locale} className={`${inter.variable} ${notoSansArmenian.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-warm-white text-charcoal">
        <NextIntlClientProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            {t("appName")}
          </a>
          <div id="main-content" className="flex min-h-full flex-1 flex-col">
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
