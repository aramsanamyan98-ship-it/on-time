import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <AppName />
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-xl border border-brand-charcoal/10 bg-white p-8 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}

function AppName() {
  const t = useTranslations("Common");
  return <span className="text-lg font-semibold text-brand-green">{t("appName")}</span>;
}
