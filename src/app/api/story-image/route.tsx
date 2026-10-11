import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hasActiveAccess } from "@/lib/subscription/trial";
import { isSlotAvailable } from "@/lib/booking/slots";
import { addDaysToDateStr, utcToZonedDateStr, utcToZonedTimeStr } from "@/lib/booking/timezone";
import { StoryLayout, STORY_WIDTH, STORY_HEIGHT } from "./StoryLayout";
import { routing, type AppLocale } from "@/i18n/routing";

// "Fill my schedule" Instagram Story (1080x1920). The specialist is taken
// from the session cookie — never a query param — so this can only render
// the logged-in specialist's own open slots. (src/proxy.ts skips /api, so the
// auth check lives here.)
//
// Satori (behind ImageResponse) falls back glyph-by-glyph across the fonts it
// is given, so Latin/Cyrillic come from Inter and Armenian from Noto Sans
// Armenian — the same pairing the app uses on screen (src/app/[locale]/layout.tsx).
// Files are bundled in src/assets/fonts (OFL-licensed) and pulled into the
// serverless trace via outputFileTracingIncludes in next.config.ts.

export const runtime = "nodejs";

const FONT_FILES = [
  { name: "Inter", file: "inter-latin-400.woff", weight: 400 },
  { name: "Inter", file: "inter-latin-700.woff", weight: 700 },
  { name: "Inter Cyrillic", file: "inter-cyrillic-400.woff", weight: 400 },
  { name: "Inter Cyrillic", file: "inter-cyrillic-700.woff", weight: 700 },
  { name: "Noto Sans Armenian", file: "noto-armenian-400.woff", weight: 400 },
  { name: "Noto Sans Armenian", file: "noto-armenian-700.woff", weight: 700 },
] as const;

type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

let fontsPromise: Promise<LoadedFont[]> | null = null;

function loadFonts(): Promise<LoadedFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ name, file, weight }): Promise<LoadedFont> => {
      const buffer = await readFile(path.join(process.cwd(), "src", "assets", "fonts", file));
      const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      return { name, data, weight, style: "normal" };
    }),
  ).catch((error) => {
    fontsPromise = null; // don't cache a failure
    throw error;
  });
  return fontsPromise;
}

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/**
 * Fetches the specialist's profile photo as a data URL so the render doesn't
 * depend on Satori fetching it itself. Only our own Supabase Storage host is
 * allowed, and only formats Satori can draw (JPEG — what the upload
 * compressor produces — and PNG). Anything else, or any failure, just means
 * the Story is rendered with an initial instead of a photo.
 */
async function loadPhotoDataUrl(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  try {
    const url = new URL(photoUrl);
    const storageHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null;
    if (url.protocol !== "https:" || !storageHost || url.host !== storageHost) return null;

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type")?.split(";")[0].trim();
    if (type !== "image/jpeg" && type !== "image/png") return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : text.trim();
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const specialist = await prisma.specialist.findUnique({ where: { id: session.specialistId } });
  if (!specialist || !specialist.emailVerifiedAt || specialist.deletedAt || !hasActiveAccess(specialist)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const lang = params.get("lang");
  const locale = routing.locales.find((l) => l === lang) as AppLocale | undefined;
  const startAt = new Date(params.get("start") ?? "");
  const serviceId = params.get("serviceId");
  if (!locale || !serviceId || Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, specialistId: specialist.id, isActive: true },
  });
  if (!service) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  // Same live-availability check every booking path uses: never render a
  // Story for a time a guest couldn't actually book.
  if (!(await isSlotAvailable(specialist, service.durationMinutes, startAt))) {
    return NextResponse.json({ error: "slotTaken" }, { status: 409 });
  }

  const tz = specialist.timezone;
  const [t, tServices, fonts, photo] = await Promise.all([
    getTranslations({ locale, namespace: "StoryImage" }),
    getTranslations({ locale, namespace: "Services" }),
    loadFonts(),
    loadPhotoDataUrl(specialist.profilePhotoUrl),
  ]);

  const todayStr = utcToZonedDateStr(new Date(), tz);
  const slotDateStr = utcToZonedDateStr(startAt, tz);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: tz }).format(startAt);
  const heading =
    slotDateStr === todayStr
      ? t("openingToday")
      : slotDateStr === addDaysToDateStr(todayStr, 1)
        ? t("openingTomorrow")
        : t("openingDay", { day: weekday.toLocaleUpperCase(locale) });
  const dateLine = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(startAt);

  const name = truncate(specialist.displayName, 32);
  const initial = Array.from(name)[0]?.toLocaleUpperCase(locale) ?? "";

  return new ImageResponse(
    (
      <StoryLayout
        heading={heading}
        time={utcToZonedTimeStr(startAt, tz)}
        dateLine={dateLine}
        serviceName={truncate(service.name, 44)}
        price={tServices("priceValue", { price: service.priceAmd.toLocaleString(locale) })}
        specialistName={name}
        specialistInitial={initial}
        photoDataUrl={photo}
        bookNow={t("bookNow")}
      />
    ),
    {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      fonts,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
