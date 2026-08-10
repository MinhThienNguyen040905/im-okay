import { buildHistoryRows, filterHistory, historyCopy } from "../presentation";
import type { HistoryItem } from "../types";

const items: HistoryItem[] = [
  {
    id: "check-in",
    event: "check_in_recorded",
    occurredAt: "2026-08-02T10:00:00.000Z",
  },
  {
    id: "drill",
    event: "drill_resolved",
    occurredAt: "2026-08-01T10:00:00.000Z",
    source: "drill",
  },
];

describe("history presentation", () => {
  it("filters check-ins without reclassifying server events", () => {
    expect(filterHistory(items, "check_in").map(({ id }) => id)).toEqual([
      "check-in",
    ]);
    expect(filterHistory(items, "alert").map(({ id }) => id)).toEqual([
      "drill",
    ]);
  });

  it("labels drill in text in addition to color", () => {
    expect(historyCopy(items[1]!).drill).toBe(true);
    expect(historyCopy(items[1]!).title).toContain("Diễn tập");
  });

  it("groups days in the account timezone", () => {
    const rows = buildHistoryRows(
      items,
      "2026-08-02T12:00:00.000Z",
      "Asia/Ho_Chi_Minh",
    );
    expect(rows.filter(({ kind }) => kind === "header")).toEqual([
      { kind: "header", id: "day:Hôm nay", label: "Hôm nay" },
      { kind: "header", id: "day:Hôm qua", label: "Hôm qua" },
    ]);
  });
});
