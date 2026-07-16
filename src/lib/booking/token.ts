import { prisma } from "@/lib/prisma";
import { generateRawToken } from "@/lib/tokens";

/**
 * Generates the guest self-service "manage your booking" token
 * (05_Database.md `booking_token`), retrying on the astronomically
 * unlikely collision the same way generateUniqueSlug does for slugs.
 */
export async function generateUniqueBookingToken(): Promise<string> {
  let candidate = generateRawToken();
  while (await prisma.appointment.findUnique({ where: { bookingToken: candidate }, select: { id: true } })) {
    candidate = generateRawToken();
  }
  return candidate;
}
