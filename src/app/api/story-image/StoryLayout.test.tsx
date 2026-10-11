import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { StoryLayout, STORY_HEIGHT, STORY_WIDTH, type StoryLayoutProps } from "./StoryLayout";

// Renders the real layout with the real bundled fonts in each language.
// Set STORY_OUT_DIR to also write the PNGs out for eyeballing (especially
// Armenian, where a missing glyph shows up as a box rather than an error).

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
const FONT_FILES = [
  ["Inter", "inter-latin-400.woff", 400],
  ["Inter", "inter-latin-700.woff", 700],
  ["Inter Cyrillic", "inter-cyrillic-400.woff", 400],
  ["Inter Cyrillic", "inter-cyrillic-700.woff", 700],
  ["Noto Sans Armenian", "noto-armenian-400.woff", 400],
  ["Noto Sans Armenian", "noto-armenian-700.woff", 700],
] as const;

const fonts = FONT_FILES.map(([name, file, weight]) => {
  const buffer = readFileSync(path.join(FONT_DIR, file));
  return {
    name,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    weight: weight as 400 | 700,
    style: "normal" as const,
  };
});

const CASES: Record<string, StoryLayoutProps> = {
  en: {
    heading: "OPENING TOMORROW",
    time: "14:30",
    dateLine: "Tuesday, October 13",
    serviceName: "Men's haircut & beard trim",
    price: "6,000 AMD",
    specialistName: "Aram Sanamyan",
    specialistInitial: "A",
    photoDataUrl: null,
    bookNow: "Book now",
  },
  ru: {
    heading: "ЕСТЬ ВРЕМЯ СЕГОДНЯ",
    time: "09:45",
    dateLine: "вторник, 13 октября",
    serviceName: "Мужская стрижка и оформление бороды",
    price: "6 000 AMD",
    specialistName: "Арам Санамян",
    specialistInitial: "А",
    photoDataUrl: null,
    bookNow: "Записаться",
  },
  hy: {
    heading: "ԱԶԱՏ ԺԱՄ ՎԱՂԸ",
    time: "17:00",
    dateLine: "երեքշաբթի, 13 հոկտեմբերի",
    serviceName: "Տղամարդու սանրվածք և մորուքի ձևավորում",
    price: "6 000 ՀՀ դրամ",
    specialistName: "Արամ Սանամյան",
    specialistInitial: "Ա",
    photoDataUrl: null,
    bookNow: "Ամրագրել",
  },
};

describe("StoryLayout", () => {
  it.each(Object.keys(CASES))("renders a 1080x1920 PNG in %s", async (lang) => {
    const response = new ImageResponse(<StoryLayout {...CASES[lang]} />, {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      fonts,
    });
    const png = Buffer.from(await response.arrayBuffer());

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(STORY_WIDTH);
    expect(png.readUInt32BE(20)).toBe(STORY_HEIGHT);

    if (process.env.STORY_OUT_DIR) writeFileSync(path.join(process.env.STORY_OUT_DIR, `story-${lang}.png`), png);
  }, 30_000);
});
