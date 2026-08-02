import { sanitizeForTelemetry, sanitizeTelemetryText } from "../logger";

describe("sanitizeForTelemetry", () => {
  it("redacts credentials and contact PII recursively", () => {
    const value = sanitizeForTelemetry({
      authorization: "Bearer private",
      profile: {
        email: "person@example.com",
        phone: "0900000000",
        status: "active",
      },
    });

    expect(value).toEqual({
      authorization: "[REDACTED]",
      profile: {
        email: "[REDACTED]",
        phone: "[REDACTED]",
        status: "active",
      },
    });
  });

  it("scrubs credentials and email addresses embedded in messages", () => {
    expect(
      sanitizeTelemetryText(
        "Request for person@example.com failed with Bearer abc.def at /accept?token=private",
      ),
    ).toBe(
      "Request for [REDACTED_EMAIL] failed with Bearer [REDACTED] at /accept?token=[REDACTED]",
    );
  });
});
