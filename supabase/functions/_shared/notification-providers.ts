export type ProviderOutcome = {
  kind: "sent" | "transient" | "permanent" | "unknown";
  errorCode?: string;
  providerMessageId?: string;
};

export type ProviderMessage = {
  body: string;
  channel: "email" | "push";
  html?: string;
  idempotencyKey: string;
  recipient: string;
  subject: string;
  title: string;
};

export interface NotificationProvider {
  readonly channel: "email" | "push";
  readonly name: string;
  send(message: ProviderMessage): Promise<ProviderOutcome>;
}

export class FakeProvider implements NotificationProvider {
  readonly channel: "email" | "push";
  readonly outcome: ProviderOutcome;
  readonly sent = new Map<string, ProviderMessage>();
  constructor(
    channel: "email" | "push",
    outcome: ProviderOutcome = { kind: "sent" },
  ) {
    this.channel = channel;
    this.outcome = outcome;
  }
  readonly name = "fake";

  async send(message: ProviderMessage): Promise<ProviderOutcome> {
    if (message.channel !== this.channel) {
      return { kind: "permanent", errorCode: "CHANNEL_MISMATCH" };
    }
    this.sent.set(message.idempotencyKey, structuredClone(message));
    return this.outcome.kind === "sent"
      ? {
          kind: "sent",
          providerMessageId:
            this.outcome.providerMessageId ??
            `fake:${this.channel}:${message.idempotencyKey}`,
        }
      : this.outcome;
  }
}

export class ResendEmailProvider implements NotificationProvider {
  readonly channel = "email" as const;
  readonly name = "resend";
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly from: string;
  constructor(apiKey: string, from: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.from = from;
    this.fetcher = fetcher;
  }

  async send(message: ProviderMessage): Promise<ProviderOutcome> {
    try {
      const response = await this.fetcher("https://api.resend.com/emails", {
        body: JSON.stringify({
          from: this.from,
          html: message.html,
          subject: message.subject,
          text: message.body,
          to: [message.recipient],
        }),
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": message.idempotencyKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await response.json().catch(() => null)) as {
        id?: unknown;
        name?: unknown;
      } | null;
      if (response.ok && typeof body?.id === "string") {
        return { kind: "sent", providerMessageId: body.id };
      }
      if (response.status === 429 || response.status >= 500) {
        return { kind: "transient", errorCode: `HTTP_${response.status}` };
      }
      return {
        kind: "permanent",
        errorCode:
          typeof body?.name === "string"
            ? body.name
            : `HTTP_${response.status}`,
      };
    } catch {
      return { kind: "unknown", errorCode: "NETWORK_OUTCOME_UNKNOWN" };
    }
  }
}

type ExpoTicket = {
  details?: { error?: unknown };
  id?: unknown;
  status?: unknown;
};

export class ExpoPushProvider implements NotificationProvider {
  readonly channel = "push" as const;
  readonly name = "expo";
  private readonly fetcher: typeof fetch;
  constructor(fetcher: typeof fetch = fetch) {
    this.fetcher = fetcher;
  }

  async send(message: ProviderMessage): Promise<ProviderOutcome> {
    try {
      const response = await this.fetcher(
        "https://exp.host/--/api/v2/push/send",
        {
          body: JSON.stringify({
            body: message.body,
            data: { type: "safety-status-changed" },
            priority: "high",
            title: message.title,
            to: message.recipient,
          }),
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          method: "POST",
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (response.status === 429 || response.status >= 500) {
        return { kind: "transient", errorCode: `HTTP_${response.status}` };
      }
      if (!response.ok) {
        return { kind: "permanent", errorCode: `HTTP_${response.status}` };
      }
      const body = (await response.json().catch(() => null)) as {
        data?: ExpoTicket | ExpoTicket[];
      } | null;
      const ticket = Array.isArray(body?.data) ? body.data[0] : body?.data;
      if (ticket?.status === "ok" && typeof ticket.id === "string") {
        return { kind: "sent", providerMessageId: ticket.id };
      }
      return {
        kind: "permanent",
        errorCode:
          typeof ticket?.details?.error === "string"
            ? ticket.details.error
            : "PUSH_TICKET_REJECTED",
      };
    } catch {
      return { kind: "unknown", errorCode: "NETWORK_OUTCOME_UNKNOWN" };
    }
  }
}

export type ExpoReceipt = { errorCode?: string; status: "error" | "ok" };

export const getExpoReceipts = async (
  ids: string[],
  fetcher: typeof fetch = fetch,
): Promise<Map<string, ExpoReceipt>> => {
  if (ids.length === 0) return new Map();
  const response = await fetcher(
    "https://exp.host/--/api/v2/push/getReceipts",
    {
      body: JSON.stringify({ ids: ids.slice(0, 1000) }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      method: "POST",
    },
  );
  if (!response.ok)
    throw new TypeError(`EXPO_RECEIPTS_HTTP_${response.status}`);
  const body = (await response.json()) as {
    data?: Record<string, { details?: { error?: unknown }; status?: unknown }>;
  };
  return new Map(
    Object.entries(body.data ?? {}).flatMap(([id, receipt]) =>
      receipt.status === "ok" || receipt.status === "error"
        ? [
            [
              id,
              {
                ...(typeof receipt.details?.error === "string"
                  ? { errorCode: receipt.details.error }
                  : {}),
                status: receipt.status,
              } as ExpoReceipt,
            ] as const,
          ]
        : [],
    ),
  );
};
