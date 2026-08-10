import {
  formatCheckInOutcomeMessage,
  isAlertAttentionState,
} from "../presentation";

describe("check-in presentation", () => {
  describe("isAlertAttentionState", () => {
    it.each(["warning", "triggering", "triggered", "acknowledged"] as const)(
      "treats %s as requiring attention",
      (state) => {
        expect(isAlertAttentionState(state)).toBe(true);
      },
    );

    it.each(["scheduled", "resolved", "cancelled", null, undefined] as const)(
      "does not treat %s as requiring attention",
      (state) => {
        expect(isAlertAttentionState(state)).toBe(false);
      },
    );
  });

  describe("formatCheckInOutcomeMessage", () => {
    const outcome = (
      result:
        | "cancelled_before_notification"
        | "correction_queued"
        | "correction_sent",
    ) => ({
      alertId: "alert-1",
      result,
      correctionStatus:
        result === "cancelled_before_notification"
          ? ("not_required" as const)
          : result === "correction_queued"
            ? ("queued" as const)
            : ("sent" as const),
    });

    it("describes a pre-notification check-in without implying an active user-facing alert", () => {
      const message = formatCheckInOutcomeMessage(
        outcome("cancelled_before_notification"),
        "fallback",
      );

      expect(message).toContain("trước khi có thông báo ra ngoài");
      expect(message).toContain("tạo thời hạn mới");
      expect(message).not.toContain("Cảnh báo đã");
    });

    it("keeps queued and sent correction messages explicit", () => {
      expect(
        formatCheckInOutcomeMessage(outcome("correction_queued"), "fallback"),
      ).toContain("đang xếp hàng gửi đính chính");
      expect(
        formatCheckInOutcomeMessage(outcome("correction_sent"), "fallback"),
      ).toContain("đã gửi đính chính");
    });

    it("uses the caller fallback when there is no alert outcome", () => {
      expect(formatCheckInOutcomeMessage(null, "fallback")).toBe("fallback");
    });
  });
});
