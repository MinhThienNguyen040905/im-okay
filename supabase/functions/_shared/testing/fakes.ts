import type { Clock } from "../clock.ts";

export type NotificationChannel = "email" | "push";

export type OutboundNotification = {
  channel: NotificationChannel;
  idempotencyKey: string;
  recipientRef: string;
  templateKey: string;
};

export type ProviderResult = {
  providerMessageId: string;
  status: "sent";
};

export class FakeClock implements Clock {
  private current: Date;

  constructor(current: Date) {
    this.current = current;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  now(): Date {
    return new Date(this.current);
  }
}

export class FakeNotificationProvider {
  readonly channel: NotificationChannel;
  readonly sent: OutboundNotification[] = [];

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  async send(message: OutboundNotification): Promise<ProviderResult> {
    if (message.channel !== this.channel) {
      throw new TypeError("CHANNEL_MISMATCH");
    }
    const existing = this.sent.find(
      ({ idempotencyKey }) => idempotencyKey === message.idempotencyKey,
    );
    if (!existing) this.sent.push(structuredClone(message));
    return {
      providerMessageId: `fake:${this.channel}:${message.idempotencyKey}`,
      status: "sent",
    };
  }
}
