"use server";

import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { createService, updateService, setServiceActive } from "@/lib/services/service-actions";
import type { ServiceFields } from "@/lib/services/validation";
import type { FieldErrors, DashboardErrorCode } from "@/lib/dashboard/errors";
import type { AppLocale } from "@/i18n/routing";

export type ServiceFormState = {
  fieldErrors?: FieldErrors<ServiceFields>;
  formError?: DashboardErrorCode;
};

function readServiceInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    priceAmd: String(formData.get("priceAmd") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

// Reads the locale ambiently via getLocale() rather than taking it as a
// bound argument, for the same reason as every action in this app — see
// app/[locale]/(auth)/register/actions.ts.
export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const result = await createService(session.specialistId, readServiceInput(formData));
  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }

  return redirect({ href: "/dashboard/services", locale });
}

export async function updateServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };
  const locale = (await getLocale()) as AppLocale;

  const serviceId = String(formData.get("serviceId") ?? "");
  const result = await updateService(session.specialistId, serviceId, readServiceInput(formData));
  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }

  return redirect({ href: "/dashboard/services", locale });
}

export type ToggleServiceState = {
  isActive?: boolean;
  formError?: DashboardErrorCode;
};

export async function toggleServiceActiveAction(
  _prevState: ToggleServiceState,
  formData: FormData,
): Promise<ToggleServiceState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };

  const serviceId = String(formData.get("serviceId") ?? "");
  const currentlyActive = formData.get("isActive") === "true";

  const result = await setServiceActive(session.specialistId, serviceId, !currentlyActive);
  if (!result.ok) {
    return { formError: result.formError };
  }

  return { isActive: result.data.isActive };
}
