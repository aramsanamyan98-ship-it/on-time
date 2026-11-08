import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SetupProgress } from "@/lib/dashboard/setup-progress";

/** "Build your account" checklist. Renders nothing once every item is done. */
export async function SetupCard({ progress }: { progress: SetupProgress }) {
  if (progress.complete) return null;
  const t = await getTranslations("Dashboard.setup");
  const nameMissing = progress.steps.find((s) => s.key === "name")?.done === false;

  return (
    <section aria-labelledby="setup-title" className="panel flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="setup-title" className="heading-section">
          {t("title")}
        </h2>
        <span className="text-sm font-medium text-brand-charcoal/75">
          {t("progress", { done: progress.doneCount, total: progress.total })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.doneCount}
        aria-label={t("title")}
        className="h-2 overflow-hidden rounded-full bg-brand-charcoal/10"
      >
        <div className="h-full bg-brand-green" style={{ width: `${(progress.doneCount / progress.total) * 100}%` }} />
      </div>
      {nameMissing && (
        <p role="note" className="rounded-md bg-brand-gold-tint px-3 py-2 text-sm text-brand-charcoal">
          {t("nameHint")}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {progress.steps.map((step) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                step.done ? "border-brand-green bg-brand-green text-white" : "border-brand-charcoal/30"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            {step.done ? (
              <span className="text-brand-charcoal/60 line-through">{t(`steps.${step.key}`)}</span>
            ) : (
              <Link href={step.href} className="font-medium text-brand-green underline-offset-2 hover:underline">
                {t(`steps.${step.key}`)}
              </Link>
            )}
            <span className="sr-only">{step.done ? t("done") : t("todo")}</span>
          </li>
        ))}
      </ul>
      <Link href="/dashboard/profile" className="btn-primary w-fit">
        {t("action")}
      </Link>
    </section>
  );
}
