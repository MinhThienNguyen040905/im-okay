import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true });

export const historyEventSchema = z.enum([
  "check_in_recorded",
  "reminder_sent",
  "snooze_applied",
  "alert_triggered",
  "alert_acknowledged",
  "alert_resolved",
  "contact_response_received",
  "correction_queued",
  "correction_sent",
  "correction_failed",
  "drill_triggered",
  "drill_acknowledged",
  "drill_resolved",
]);

export const historyItemSchema = z
  .object({
    id: z.string().min(1).max(128),
    event: historyEventSchema,
    occurredAt: timestampSchema,
    nextDeadlineAt: timestampSchema.nullable().optional(),
    durationHours: z
      .union([z.literal(1), z.literal(4), z.literal(8)])
      .optional(),
    channels: z
      .array(z.enum(["push", "email"]))
      .max(2)
      .optional(),
    source: z.enum(["deadline", "sos", "drill"]).optional(),
  })
  .strict();

export const historyPageSchema = z
  .object({
    serverTime: timestampSchema,
    summary: z
      .object({
        rangeDays: z.literal(7),
        onTimeCheckInCount: z.number().int().nonnegative(),
      })
      .strict(),
    items: z.array(historyItemSchema).max(50),
    nextCursor: z.string().min(1).max(512).nullable(),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const ids = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: "History item ids must be unique within a page.",
          path: ["items", index, "id"],
        });
      }
      ids.add(item.id);
      if (
        index > 0 &&
        Date.parse(items[index - 1]!.occurredAt) < Date.parse(item.occurredAt)
      ) {
        context.addIssue({
          code: "custom",
          message: "History items must be ordered newest first.",
          path: ["items", index, "occurredAt"],
        });
      }
    }
  });

export type HistoryEvent = z.infer<typeof historyEventSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;
export type HistoryPage = z.infer<typeof historyPageSchema>;
export type HistoryFilter = "all" | "check_in" | "alert";

export type HistoryApi = {
  getHistory: (cursor?: string | null, limit?: number) => Promise<HistoryPage>;
};

export type HistoryErrorKind = "offline" | "timeout" | "server" | "contract";

export class HistoryApiError extends Error {
  constructor(
    message: string,
    readonly kind: HistoryErrorKind,
    readonly retryable: boolean,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "HistoryApiError";
  }
}
