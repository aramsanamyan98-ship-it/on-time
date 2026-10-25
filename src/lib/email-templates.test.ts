import { describe, expect, it } from "vitest";
import { buildBookingConfirmationEmail, buildTrialEndedEmail } from "@/lib/email-templates";

const NAME = `Tom & "Jerry" <b>`;

describe("email HTML escaping", () => {
  it("escapes user-supplied text in the HTML body only", () => {
    const email = buildBookingConfirmationEmail("en", {
      guestName: NAME,
      specialistName: NAME,
      serviceName: "Cut",
      dateTime: "Monday 10:00",
      manageLink: "https://x.test/en/booking/t?a=1&b=2",
    });

    expect(email.html).toContain("Tom &amp; &quot;Jerry&quot; &lt;b&gt;");
    expect(email.html).not.toContain("<b>");
    expect(email.html).toContain('href="https://x.test/en/booking/t?a=1&amp;b=2"');

    expect(email.text).toContain(NAME);
    expect(email.subject).toBe(`Your appointment with ${NAME} is confirmed`);
  });

  it("escapes the name in specialist-facing emails too", () => {
    const email = buildTrialEndedEmail("en", { name: NAME, endDate: "1 Jan", planLink: "https://x.test/plan" });
    expect(email.html).not.toContain("<b>");
    expect(email.html).toContain("&lt;b&gt;");
  });
});
