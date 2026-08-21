import {
  channelsCopy,
  deliveryStatusCopy,
  deliveryStatusText,
  formatAlertCountdown,
} from "../presentation";

describe("alert presentation", () => {
  it("formats a precise warning countdown", () => {
    expect(formatAlertCountdown(3_520_000)).toBe("00:58:40");
    expect(formatAlertCountdown(0)).toBe("00:00:00");
  });

  it("does not equate sent delivery with contact acknowledgement", () => {
    expect(deliveryStatusCopy.sent).toContain("chưa có nghĩa");
    expect(channelsCopy(["push", "email"])).toBe("Push và Email");
    expect(channelsCopy(["push", "email"], "en")).toBe("Push and Email");
    expect(deliveryStatusText("sent", "en")).toContain("does not mean");
  });
});
