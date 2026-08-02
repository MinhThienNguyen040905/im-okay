import { historyPageSchema } from "../types";

export const historyPage = {
  serverTime: "2026-08-02T12:00:00.000Z",
  summary: { rangeDays: 7 as const, onTimeCheckInCount: 1 },
  items: [
    {
      id: "event-1",
      event: "check_in_recorded" as const,
      occurredAt: "2026-08-02T10:00:00.000Z",
      nextDeadlineAt: "2026-08-04T00:00:00.000Z",
    },
  ],
  nextCursor: null,
};

describe("history safe projection contract", () => {
  it("accepts allowlisted history metadata", () => {
    expect(historyPageSchema.parse(historyPage).items[0]?.event).toBe(
      "check_in_recorded",
    );
  });

  it.each(["providerError", "token", "contactEmail"])(
    "rejects sensitive or provider field %s",
    (field) => {
      expect(() =>
        historyPageSchema.parse({
          ...historyPage,
          items: [{ ...historyPage.items[0], [field]: "must-not-render" }],
        }),
      ).toThrow();
    },
  );

  it("rejects duplicate ids and pages not ordered newest first", () => {
    expect(() =>
      historyPageSchema.parse({
        ...historyPage,
        items: [
          historyPage.items[0],
          {
            ...historyPage.items[0],
            occurredAt: "2026-08-02T11:00:00.000Z",
          },
        ],
      }),
    ).toThrow();
  });
});
