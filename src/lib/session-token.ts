import { SignJWT, jwtVerify } from "jose";

// Pure JWT helpers with no Node-only / Next-server-only dependencies, so
// this module can be imported from both Route Handlers/Server Components
// (via session.ts) and from middleware, which runs on the Edge runtime.

export const SESSION_COOKIE_NAME = "ontime_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  specialistId: string;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.specialistId !== "string") return null;
    return { specialistId: payload.specialistId };
  } catch {
    return null;
  }
}
