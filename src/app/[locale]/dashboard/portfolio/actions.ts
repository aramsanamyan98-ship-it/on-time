"use server";

import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { addPortfolioPhoto, deletePortfolioPhoto, movePortfolioPhoto } from "@/lib/portfolio/manage-portfolio";
import { hasReachedBasicPortfolioPhotoLimit } from "@/lib/subscription/plan-limits";
import type { DashboardErrorCode } from "@/lib/dashboard/errors";
import type { AppLocale } from "@/i18n/routing";

export type PortfolioActionState = {
  formError?: DashboardErrorCode;
};

export async function uploadPortfolioPhotoAction(
  _prevState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  // 02_PRD.md Section 14 (updated): Basic (past trial, not upgraded) is
  // capped at 5 portfolio photos; Starter/Pro and active trials are exempt.
  const specialist = await prisma.specialist.findUnique({ where: { id: session.specialistId } });
  if (!specialist || specialist.deletedAt) return { formError: "generic" };
  if (await hasReachedBasicPortfolioPhotoLimit(specialist)) {
    return { formError: "portfolioLimitReached" };
  }

  const file = formData.get("photo");
  const result = await addPortfolioPhoto(session.specialistId, file instanceof File ? file : null);
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: "/dashboard/portfolio", locale });
}

export async function deletePortfolioPhotoAction(
  _prevState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const photoId = String(formData.get("photoId") ?? "");
  const result = await deletePortfolioPhoto(session.specialistId, photoId);
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: "/dashboard/portfolio", locale });
}

export async function movePortfolioPhotoAction(
  _prevState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const photoId = String(formData.get("photoId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  const result = await movePortfolioPhoto(session.specialistId, photoId, direction);
  if (!result.ok) return { formError: result.formError };

  return redirect({ href: "/dashboard/portfolio", locale });
}
