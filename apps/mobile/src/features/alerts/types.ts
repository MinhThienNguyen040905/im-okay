import { z } from "zod";

import type { LocationShareInput } from "@/features/location/types";

const timestampSchema = z.iso.datetime({ offset: true });
export const snoozeDurationSchema = z.union([
  z.literal(1),
  z.literal(4),
  z.literal(8),
]);

export const alertSourceSchema = z.enum(["deadline", "sos", "drill"]);
export const alertStateSchema = z.enum([
  "scheduled",
  "warning",
  "triggering",
  "triggered",
  "acknowledged",
  "resolved",
  "cancelled",
]);
export const deliveryStatusSchema = z.enum([
  "not_started",
  "queued",
  "partial",
  "sent",
  "failed",
]);
export const correctionStatusSchema = z.enum([
  "not_required",
  "queued",
  "sent",
  "failed",
]);

export const alertContextProjectionSchema = z
  .object({
    serverTime: timestampSchema,
    plan: z.object({
      state: z.enum(["active", "snoozed", "inactive"]),
      nextDeadlineAt: timestampSchema.nullable(),
      snoozedUntil: timestampSchema.nullable(),
    }),
    contactSummary: z.object({
      eligibleCount: z.number().int().min(0).max(3),
      firstContactName: z.string().trim().min(1).max(80).nullable(),
      displayNames: z.array(z.string().trim().min(1).max(80)).max(3),
    }),
    channelSummary: z.object({
      deadline: z.array(z.enum(["push", "email"])).max(2),
      sos: z.array(z.enum(["push", "email"])).max(2),
      drill: z.array(z.enum(["push", "email"])).max(2),
    }),
    currentAlert: z
      .object({
        id: z.string().min(1),
        source: alertSourceSchema,
        state: alertStateSchema,
        triggerAt: timestampSchema.nullable(),
        delivery: z.object({
          status: deliveryStatusSchema,
          channels: z.array(z.enum(["push", "email"])).max(2),
          acceptedAt: timestampSchema.nullable(),
        }),
        correction: z.object({
          status: correctionStatusSchema,
          requestedAt: timestampSchema.nullable(),
        }),
      })
      .nullable(),
    availableActions: z.object({
      canCheckIn: z.boolean(),
      canSendSos: z.boolean(),
      canSendDrill: z.boolean(),
      snoozeDurationsHours: z.array(snoozeDurationSchema).max(3),
    }),
  })
  .superRefine(({ availableActions, contactSummary }, context) => {
    if (contactSummary.eligibleCount !== contactSummary.displayNames.length) {
      context.addIssue({
        code: "custom",
        message: "Eligible contact count must match display names.",
        path: ["contactSummary", "eligibleCount"],
      });
    }
    if (
      contactSummary.firstContactName !==
      (contactSummary.displayNames[0] ?? null)
    ) {
      context.addIssue({
        code: "custom",
        message: "First contact must match the first eligible display name.",
        path: ["contactSummary", "firstContactName"],
      });
    }
    const durations = availableActions.snoozeDurationsHours;
    if (new Set(durations).size !== durations.length) {
      context.addIssue({
        code: "custom",
        message: "Snooze durations must be unique.",
        path: ["availableActions", "snoozeDurationsHours"],
      });
    }
  });

export type SnoozeDuration = z.infer<typeof snoozeDurationSchema>;
export type AlertSource = z.infer<typeof alertSourceSchema>;
export type AlertState = z.infer<typeof alertStateSchema>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type AlertContextProjection = z.infer<
  typeof alertContextProjectionSchema
>;

export type AlertContextSnapshot = {
  projection: AlertContextProjection;
  receivedAtMs: number;
  clockOffsetMs: number;
};

export type AlertsApi = {
  getContext: () => Promise<AlertContextSnapshot>;
  snooze: (
    durationHours: SnoozeDuration,
    idempotencyKey: string,
  ) => Promise<AlertContextSnapshot>;
  sendSos: (
    idempotencyKey: string,
    location?: LocationShareInput | null,
  ) => Promise<AlertContextSnapshot>;
  sendDrill: (idempotencyKey: string) => Promise<AlertContextSnapshot>;
};

export type AlertsErrorKind = "offline" | "timeout" | "server" | "contract";

export class AlertsApiError extends Error {
  constructor(
    message: string,
    readonly kind: AlertsErrorKind,
    readonly retryable: boolean,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "AlertsApiError";
  }
}
