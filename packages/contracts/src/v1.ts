import { z } from "zod";

export const API_CONTRACT_VERSION = "v1" as const;

export const apiRoutes = {
  accountDeletionRequests: "/v1/account/deletion-requests",
  accountExportRequests: "/v1/account/export-requests",
  alertCurrent: "/v1/alerts/current",
  alertDrill: "/v1/alerts/drill",
  alertSos: "/v1/alerts/sos",
  authenticatedHealth: "/v1/health",
  checkIns: "/v1/check-ins",
  devices: "/v1/me/devices",
  history: "/v1/history",
  profile: "/v1/me",
  publicHealth: "/v1/health",
  safetyPlan: "/v1/safety-plan",
  safetyPlanDisable: "/v1/safety-plan/disable",
  safetyPlanSnooze: "/v1/safety-plan/snooze",
  safetyPlanStatus: "/v1/safety-plan/status",
  trustedContacts: "/v1/trusted-contacts",
  trustedContactsReorder: "/v1/trusted-contacts/reorder",
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

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(64),
});

export const deviceInputSchema = z.object({
  expoPushToken: z.string().min(10).max(512),
  platform: z.enum(["android", "ios"]),
});

export const safetyPlanInputSchema = z.object({
  checkInIntervalHours: intervalSchema,
});

export const locationShareInputSchema = z.object({
  accuracyMeters: z.number().finite().positive().max(50_000),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const checkInInputSchema = z.object({
  location: locationShareInputSchema.optional(),
  source: z.literal("mobile"),
});

export const trustedContactInputSchema = z.object({
  consentConfirmed: z.literal(true),
  displayName: z.string().trim().min(1).max(80),
  email: z.email(),
});

export const trustedContactsProjectionSchema = z.object({
  contacts: z
    .array(
      z.object({
        displayName: z.string().trim().min(1).max(80),
        email: z.email(),
        id: z.string().uuid(),
        invitation: z.object({
          expiresAt: timestampSchema.nullable(),
          resendAvailableAt: timestampSchema.nullable(),
          sentAt: timestampSchema.nullable(),
          status: z.enum([
            "pending",
            "accepted",
            "declined",
            "expired",
            "revoked",
          ]),
        }),
        priority: z.number().int().min(1).max(3),
      }),
    )
    .max(3),
  maxContacts: z.literal(3),
  serverTime: timestampSchema,
});

export const publicLinkStatusSchema = z.enum([
  "accepted",
  "active",
  "cancelled",
  "declined",
  "expired",
  "invalid",
  "pending",
  "resolved",
  "revoked",
  "used",
]);

export const publicInvitationProjectionSchema = z.object({
  allowedActions: z.array(z.enum(["accept", "decline"])),
  contactDisplayName: z.string().max(80).optional(),
  expiresAt: timestampSchema.optional(),
  ownerDisplayName: z.string().max(80).optional(),
  serverTime: timestampSchema,
  status: publicLinkStatusSchema,
});

export const publicAlertProjectionSchema = z.object({
  acknowledgedAt: timestampSchema.nullable().optional(),
  alertReference: z.string().max(12).optional(),
  allowedActions: z.array(z.enum(["acknowledge", "cannot_help", "resolve"])),
  contactDisplayName: z.string().max(80).optional(),
  deadlineAt: timestampSchema.optional(),
  endedAt: timestampSchema.nullable().optional(),
  lastCheckInAt: timestampSchema.nullable().optional(),
  location: z
    .object({
      accuracyMeters: z.number().positive(),
      capturedAt: timestampSchema,
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      source: z.enum(["check_in", "sos"]),
    })
    .nullable()
    .optional(),
  ownerDisplayName: z.string().max(80).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  responseAction: z
    .enum(["acknowledge", "cannot_help", "resolve"])
    .nullable()
    .optional(),
  serverTime: timestampSchema,
  source: z.enum(["deadline", "drill", "sos"]).optional(),
  status: publicLinkStatusSchema,
  triggeredAt: timestampSchema.nullable().optional(),
});

export const onboardingStateSchema = z.object({
  serverTime: timestampSchema,
  profile: z.object({
    displayName: z.string().trim().min(1).max(80).nullable(),
    timezone: z.string().trim().min(1).max(64),
    accountState: z.enum(["active", "disabled", "deletion_requested"]),
  }),
  safetyPlan: z.object({
    state: z.enum(["active", "snoozed", "inactive"]),
    intervalHours: intervalSchema,
    lastCheckInAt: timestampSchema.nullable(),
    nextDeadlineAt: timestampSchema.nullable(),
  }),
  push: z.object({
    registration: z.enum(["none", "registered"]),
  }),
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
