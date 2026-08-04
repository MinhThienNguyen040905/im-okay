import type { DatabaseGateway } from "./database.ts";
import {
  ExpoPushProvider,
  FakeProvider,
  type NotificationProvider,
  type ProviderOutcome,
  ResendEmailProvider,
} from "./notification-providers.ts";
import { renderNotification } from "./notification-templates.ts";

type ClaimedDelivery = {
  attemptCount: number;
  channel: "email" | "push";
  id: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  publicToken?: string | null;
  recipientRef: string;
  templateKey: string;
  templateVersion: number;
};

export type NotificationDispatcher = {
  dispatch(deliveryId?: string): Promise<number>;
};

const env = (name: string): string | undefined =>
  Deno.env.get(name)?.trim() || undefined;

const configuredProviders = (): Map<string, NotificationProvider> => {
  if (env("NOTIFICATION_PROVIDER_MODE") !== "live") {
    return new Map([
      ["email", new FakeProvider("email")],
      ["push", new FakeProvider("push")],
    ]);
  }
  const resendKey = env("RESEND_API_KEY");
  const resendFrom = env("RESEND_FROM");
  if (!resendKey || !resendFrom)
    throw new TypeError("RESEND_CONFIGURATION_REQUIRED");
  return new Map<string, NotificationProvider>([
    ["email", new ResendEmailProvider(resendKey, resendFrom)],
    ["push", new ExpoPushProvider()],
  ]);
};

const parseClaims = (value: unknown): ClaimedDelivery[] => {
  if (!Array.isArray(value)) throw new TypeError("INVALID_DELIVERY_CLAIM");
  return value.filter((item): item is ClaimedDelivery => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<ClaimedDelivery>;
    return (
      (candidate.channel === "email" || candidate.channel === "push") &&
      typeof candidate.id === "string" &&
      typeof candidate.idempotencyKey === "string" &&
      typeof candidate.recipientRef === "string" &&
      typeof candidate.templateKey === "string" &&
      typeof candidate.templateVersion === "number" &&
      !!candidate.payload &&
      typeof candidate.payload === "object"
    );
  });
};

export const createNotificationDispatcher = (
  database: DatabaseGateway,
  providers = configuredProviders(),
  publicWebUrl = env("PUBLIC_CONTACT_WEB_URL") ?? "http://127.0.0.1:8082",
): NotificationDispatcher => ({
  async dispatch(deliveryId) {
    const claimed = parseClaims(
      await database.call("internal_claim_notification_deliveries", {
        p_batch_size: deliveryId ? 1 : 20,
        p_delivery_id: deliveryId ?? null,
      }),
    );
    for (const delivery of claimed) {
      const provider = providers.get(delivery.channel);
      let outcome: ProviderOutcome;
      if (!provider) {
        outcome = { kind: "permanent", errorCode: "PROVIDER_DISABLED" };
      } else {
        try {
          const content = renderNotification({
            payload: delivery.payload,
            publicToken: delivery.publicToken,
            publicWebUrl,
            templateKey: delivery.templateKey,
            templateVersion: delivery.templateVersion,
          });
          outcome = await provider.send({
            ...content,
            channel: delivery.channel,
            idempotencyKey: delivery.idempotencyKey,
            recipient: delivery.recipientRef,
          });
        } catch {
          outcome = { kind: "permanent", errorCode: "TEMPLATE_INVALID" };
        }
      }
      await database.call("internal_record_notification_outcome", {
        p_delivery_id: delivery.id,
        p_error_code: outcome.errorCode ?? null,
        p_outcome: outcome.kind,
        p_provider: provider?.name ?? "disabled",
        p_provider_message_id: outcome.providerMessageId ?? null,
      });
    }
    return claimed.length;
  },
});
