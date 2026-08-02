import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true });
const intervalSchema = z.union([z.literal(24), z.literal(36), z.literal(48)]);

export const isIanaTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value.includes("/") || value === "UTC";
  } catch {
    return false;
  }
};

export const settingsProjectionSchema = z
  .object({
    serverTime: timestampSchema,
    profile: z
      .object({
        displayName: z.string().trim().min(1).max(80),
        email: z.email(),
        timezone: z.string().trim().refine(isIanaTimezone),
      })
      .strict(),
    safetyPlan: z
      .object({
        state: z.enum(["active", "snoozed", "inactive"]),
        intervalHours: intervalSchema,
        nextDeadlineAt: timestampSchema.nullable(),
        snoozedUntil: timestampSchema.nullable(),
      })
      .strict(),
    contacts: z
      .object({
        totalCount: z.number().int().min(0).max(3),
        acceptedCount: z.number().int().min(0).max(3),
      })
      .strict(),
    push: z
      .object({
        registration: z.enum(["none", "pending", "registered", "disabled"]),
      })
      .strict(),
    account: z
      .object({
        exportRequest: z
          .object({
            status: z.enum(["requested", "processing", "ready", "completed", "failed"]),
            requestedAt: timestampSchema,
          })
          .strict()
          .nullable(),
        deletionRequest: z
          .object({
            status: z.enum(["requested", "scheduled", "processing", "completed", "cancelled"]),
            requestedAt: timestampSchema,
          })
          .strict()
          .nullable(),
      })
      .strict(),
    allowedActions: z
      .object({
        canUpdateProfile: z.boolean(),
        canUpdateSafetyPlan: z.boolean(),
        canDisableSafetyPlan: z.boolean(),
        canRequestExport: z.boolean(),
        canRequestDeletion: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine(({ contacts, safetyPlan }, context) => {
    if (contacts.acceptedCount > contacts.totalCount) {
      context.addIssue({
        code: "custom",
        message: "Accepted contacts cannot exceed total contacts.",
        path: ["contacts", "acceptedCount"],
      });
    }
    if (safetyPlan.state === "inactive" && safetyPlan.nextDeadlineAt !== null) {
      context.addIssue({
        code: "custom",
        message: "Inactive safety plan cannot expose a next deadline.",
        path: ["safetyPlan", "nextDeadlineAt"],
      });
    }
  });

export type SettingsProjection = z.infer<typeof settingsProjectionSchema>;
export type SettingsInterval = 24 | 36 | 48;
export type SettingsProfileInput = { displayName: string; timezone: string };

export type SettingsApi = {
  getSettings: () => Promise<SettingsProjection>;
  updateProfile: (input: SettingsProfileInput) => Promise<SettingsProjection>;
  updateSafetyPlan: (intervalHours: SettingsInterval) => Promise<SettingsProjection>;
  disableSafetyPlan: (idempotencyKey: string) => Promise<SettingsProjection>;
  requestAccountExport: (idempotencyKey: string) => Promise<SettingsProjection>;
  requestAccountDeletion: (idempotencyKey: string) => Promise<SettingsProjection>;
};

export type SettingsErrorKind = "offline" | "timeout" | "server" | "contract";

export class SettingsApiError extends Error {
  constructor(
    message: string,
    readonly kind: SettingsErrorKind,
    readonly retryable: boolean,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "SettingsApiError";
  }
}
