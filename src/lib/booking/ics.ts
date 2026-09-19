// RFC 5545 (iCalendar) generation for the guest-facing "Add to calendar"
// button — a one-time .ics download, not an ongoing sync, so this is the
// entire calendar integration: no OAuth, no provider APIs.

export type IcsEvent = {
  /** Stable, globally-unique identifier for this event (e.g. `${bookingToken}@ontime.am`). */
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
};

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDateUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** RFC 5545 §3.1 line folding: no content line may exceed 75 octets; continuations start with a space. */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    const limit = chunks.length === 0 ? 75 : 74; // continuation lines reserve 1 octet for the leading space
    if (currentBytes + charBytes > limit) {
      chunks.push(current);
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

export function buildIcsContent(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OnTime//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDateUtc(new Date())}`,
    `DTSTART:${formatIcsDateUtc(event.startAt)}`,
    `DTEND:${formatIcsDateUtc(event.endAt)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

/** Triggers a browser download of the .ics content. Client-side only. */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
