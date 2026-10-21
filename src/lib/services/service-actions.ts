import { prisma } from "@/lib/prisma";
import { validateService, type ServiceInput } from "@/lib/services/validation";
import type { ActionResult } from "@/lib/dashboard/errors";
import { hasActiveAccess } from "@/lib/subscription/trial";
import type { Service } from "@/generated/prisma/client";

// 02_PRD.md Section 14: managing services is a dashboard feature that
// requires active trial/subscription access. The layout already blocks the
// dashboard UI; this re-checks server-side since the server actions that
// call these are directly callable.
async function specialistHasAccess(specialistId: string): Promise<boolean> {
  const specialist = await prisma.specialist.findUnique({ where: { id: specialistId } });
  return !!specialist && hasActiveAccess(specialist);
}

export async function createService(specialistId: string, input: ServiceInput): Promise<ActionResult<Service>> {
  if (!(await specialistHasAccess(specialistId))) return { ok: false, formError: "generic" };

  const { fieldErrors, data } = validateService(input);
  if (!data) return { ok: false, fieldErrors };

  const service = await prisma.service.create({ data: { specialistId, ...data } });
  return { ok: true, data: service };
}

export async function updateService(
  specialistId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<ActionResult<Service>> {
  if (!(await specialistHasAccess(specialistId))) return { ok: false, formError: "generic" };

  const { fieldErrors, data } = validateService(input);
  if (!data) return { ok: false, fieldErrors };

  const existing = await prisma.service.findFirst({ where: { id: serviceId, specialistId } });
  if (!existing) return { ok: false, formError: "notFound" };

  const service = await prisma.service.update({ where: { id: serviceId }, data });
  return { ok: true, data: service };
}

export async function setServiceActive(
  specialistId: string,
  serviceId: string,
  isActive: boolean,
): Promise<ActionResult<Service>> {
  if (!(await specialistHasAccess(specialistId))) return { ok: false, formError: "generic" };

  const existing = await prisma.service.findFirst({ where: { id: serviceId, specialistId } });
  if (!existing) return { ok: false, formError: "notFound" };

  const service = await prisma.service.update({ where: { id: serviceId }, data: { isActive } });
  return { ok: true, data: service };
}
