import { safetyStatusSchema } from "../types";

describe("safety status contract", () => {
  it("rejects a status without authoritative server time", () => {
    expect(
      safetyStatusSchema.safeParse({
        plan: {
          state: "active",
          intervalHours: 36,
          lastCheckInAt: null,
          nextDeadlineAt: null,
        },
        contactSummary: { confirmedCount: 0 },
      }).success,
    ).toBe(false);
  });
});
