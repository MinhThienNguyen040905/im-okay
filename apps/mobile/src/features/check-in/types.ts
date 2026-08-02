import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true });
const intervalSchema = z.union([z.literal(24), z.literal(36), z.literal(48)]);

export const checkInAlertOutcomeSchema = z.object({
  alertId: z.string().min(1),
  result: z.enum([
    "cancelled_before_notification",
    "correction_queued",
    "correction_sent",
  ]),
  correctionStatus: z.enum(["not_required", "queued", "sent", "failed"]),
});

export const safetyStatusSchema = z.object({
  serverTime: timestampSchema,
  plan: z.object({
    state: z.enum(["active", "snoozed", "inactive"]),
    intervalHours: intervalSchema,
    lastCheckInAt: timestampSchema.nullable(),
    nextDeadlineAt: timestampSchema.nullable(),
    snoozedUntil: timestampSchema.nullable().optional(),
  }),
  contactSummary: z.object({
    confirmedCount: z.number().int().nonnegative(),
  }),
  currentAlert: z
    .object({
      id: z.string().min(1),
      state: z.enum([
        "scheduled",
        "warning",
        "triggering",
        "triggered",
        "acknowledged",
        "resolved",
        "cancelled",
      ]),
    })
    .nullable()
    .optional(),
  lastAlertOutcome: checkInAlertOutcomeSchema.nullable().optional(),
});

export type SafetyStatus = z.infer<typeof safetyStatusSchema>;
export type CheckInAlertOutcome = z.infer<typeof checkInAlertOutcomeSchema>;

export type SafetyStatusSnapshot = {
  clockOffsetMs: number;
  receivedAtMs: number;
  status: SafetyStatus;
};

export type CheckInApi = {
  getStatus: () => Promise<SafetyStatusSnapshot>;
  checkIn: (idempotencyKey: string) => Promise<SafetyStatusSnapshot>;
};

export type CheckInErrorKind = "offline" | "timeout" | "server" | "contract";

export class CheckInApiError extends Error {
  constructor(
    message: string,
    readonly kind: CheckInErrorKind,
    readonly retryable: boolean,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "CheckInApiError";
  }
}
