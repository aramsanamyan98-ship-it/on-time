import { prisma } from "@/lib/prisma";
import { validateService, type ServiceInput } from "@/lib/services/validation";
import type { ActionResult } from "@/lib/dashboard/errors";
import type { Service } from "@/generated/prisma/client";

export async function createService(specialistId: string, input: ServiceInput): Promise<ActionResult<Service>> {
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
  const existing = await prisma.service.findFirst({ where: { id: serviceId, specialistId } });
  if (!existing) return { ok: false, formError: "notFound" };

  const service = await prisma.service.update({ where: { id: serviceId }, data: { isActive } });
  return { ok: true, data: service };
}
