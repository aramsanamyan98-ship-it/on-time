import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  return redirect({ href: session ? "/dashboard" : "/login", locale });
}
