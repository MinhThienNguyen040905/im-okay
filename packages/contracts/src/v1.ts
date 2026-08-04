import { z } from "zod";

export const API_CONTRACT_VERSION = "v1" as const;

export const apiRoutes = {
  authenticatedHealth: "/v1/health",
  checkIns: "/v1/check-ins",
  profile: "/v1/me",
  publicHealth: "/v1/health",
  safetyPlan: "/v1/safety-plan",
  safetyPlanStatus: "/v1/safety-plan/status",
} as const;

const timestampSchema = z.iso.datetime({ offset: true });
const intervalSchema = z.union([z.literal(24), z.literal(36), z.literal(48)]);

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    retryable: z.boolean(),
  }),
});

export const healthResponseSchema = z.object({
  contractVersion: z.literal(API_CONTRACT_VERSION),
  serverTime: timestampSchema,
  service: z.enum(["api", "public-api"]),
  status: z.literal("ok"),
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
  contactSummary: z.object({ confirmedCount: z.number().int().nonnegative() }),
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
  lastAlertOutcome: z
    .object({
      alertId: z.string().min(1),
      result: z.enum([
        "cancelled_before_notification",
        "correction_queued",
        "correction_sent",
      ]),
      correctionStatus: z.enum(["not_required", "queued", "sent", "failed"]),
    })
    .nullable()
    .optional(),
});

export const safetyStatusFixture = {
  contactSummary: { confirmedCount: 0 },
  currentAlert: null,
  plan: {
    intervalHours: 36,
    lastCheckInAt: null,
    nextDeadlineAt: null,
    state: "inactive",
  },
  serverTime: "2026-08-04T00:00:00.000Z",
} as const;
