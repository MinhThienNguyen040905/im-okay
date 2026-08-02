import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true });

export const invitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
]);

export const trustedContactSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1).max(80),
  email: z.email(),
  priority: z.number().int().min(1).max(3),
  invitation: z.object({
    status: invitationStatusSchema,
    sentAt: timestampSchema.nullable(),
    expiresAt: timestampSchema.nullable(),
    resendAvailableAt: timestampSchema.nullable(),
  }),
});

export const trustedContactsProjectionSchema = z
  .object({
    serverTime: timestampSchema,
    maxContacts: z.literal(3),
    contacts: z.array(trustedContactSchema).max(3),
  })
  .superRefine(({ contacts }, context) => {
    const ids = new Set<string>();
    const priorities = new Set<number>();
    const emails = new Set<string>();

    for (const [index, contact] of contacts.entries()) {
      const normalizedEmail = contact.email.trim().toLocaleLowerCase("en-US");
      if (ids.has(contact.id)) {
        context.addIssue({
          code: "custom",
          message: "Contact id must be unique.",
          path: ["contacts", index, "id"],
        });
      }
      if (priorities.has(contact.priority)) {
        context.addIssue({
          code: "custom",
          message: "Contact priority must be unique.",
          path: ["contacts", index, "priority"],
        });
      }
      if (emails.has(normalizedEmail)) {
        context.addIssue({
          code: "custom",
          message: "Contact email must be unique.",
          path: ["contacts", index, "email"],
        });
      }
      ids.add(contact.id);
      priorities.add(contact.priority);
      emails.add(normalizedEmail);
    }
  });

export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type TrustedContact = z.infer<typeof trustedContactSchema>;
export type TrustedContactsProjection = z.infer<
  typeof trustedContactsProjectionSchema
>;

export type TrustedContactsSnapshot = {
  projection: TrustedContactsProjection;
  receivedAtMs: number;
  clockOffsetMs: number;
};

export type CreateTrustedContactInput = {
  displayName: string;
  email: string;
  consentConfirmed: true;
};

export type TrustedContactsApi = {
  getContacts: () => Promise<TrustedContactsSnapshot>;
  createContact: (
    input: CreateTrustedContactInput,
  ) => Promise<TrustedContactsSnapshot>;
  removeContact: (contactId: string) => Promise<TrustedContactsSnapshot>;
  reorderContacts: (
    orderedContactIds: string[],
  ) => Promise<TrustedContactsSnapshot>;
  resendInvitation: (contactId: string) => Promise<TrustedContactsSnapshot>;
};

export type TrustedContactsErrorKind =
  "offline" | "timeout" | "server" | "contract";

export type TrustedContactsErrorDetails = {
  field?: "email";
  retryAt?: string;
};

export class TrustedContactsApiError extends Error {
  constructor(
    message: string,
    readonly kind: TrustedContactsErrorKind,
    readonly retryable: boolean,
    readonly code?: string,
    readonly requestId?: string,
    readonly details?: TrustedContactsErrorDetails,
  ) {
    super(message);
    this.name = "TrustedContactsApiError";
  }
}
