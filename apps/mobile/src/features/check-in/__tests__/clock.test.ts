import {
  calculateServerClockOffset,
  formatRemainingTime,
  isDeadlineApproaching,
  remainingUntilDeadline,
} from "../clock";

describe("server clock display", () => {
  it("uses the network midpoint to estimate server offset", () => {
    expect(
      calculateServerClockOffset("2026-08-02T10:00:05.000Z", 1_000, 3_000),
    ).toBe(Date.parse("2026-08-02T10:00:05.000Z") - 2_000);
  });

  it("only derives remaining display time from the server deadline", () => {
    const clientNow = Date.parse("2026-08-02T10:00:00.000Z");
    const deadline = "2026-08-02T12:30:00.000Z";
    expect(remainingUntilDeadline(deadline, 0, clientNow)).toBe(9_000_000);
    expect(formatRemainingTime(9_000_000)).toBe("2 giờ 30 phút");
    expect(formatRemainingTime(9_000_000, "en")).toBe("2 hr 30 min");
  });

  it("uses four hours only as an approaching-display threshold", () => {
    expect(isDeadlineApproaching(4 * 60 * 60_000)).toBe(true);
    expect(isDeadlineApproaching(4 * 60 * 60_000 + 1)).toBe(false);
    expect(isDeadlineApproaching(0)).toBe(false);
  });
});
